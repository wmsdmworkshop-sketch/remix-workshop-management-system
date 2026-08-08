import mysql from "mysql2/promise";
import { envConfig, validateEnvironment } from "../config/env.ts";
import { TelemetryService, DbHealthMetrics } from "./telemetry-service.ts";
import { HealthMonitor } from "./health-monitor.ts";
import { RetryExecutor } from "./retry-executor.ts";

// Execute the central safety gate and environment validation
// BEFORE any connection pooling is attempted.
validateEnvironment();

/**
 * =============================================================================
 * DWIP Enterprise Platform — Database Persistence & Resilience Layer (WP-05)
 * Bounded Context: Persistence / Connection Pool & Telemetry
 * Description: Composable database resilience infrastructure delegating to
 *              TelemetryService, HealthMonitor, and RetryExecutor while
 *              maintaining 100% backward compatibility for all pool exports.
 * =============================================================================
 */

export type { DbHealthMetrics };

// Connection Pool Factory
export const createPool = () => {
  const host = envConfig.DB_HOST;
  const port = envConfig.DB_PORT;
  const user = envConfig.DB_USER;
  const password = envConfig.DB_PASSWORD;
  const database = envConfig.DB_DATABASE;
  const socketPath = envConfig.DB_SOCKET_PATH;
  
  const ssl = envConfig.DB_SSL ? { rejectUnauthorized: false } : undefined;

  const config: mysql.PoolOptions = {
    host: socketPath ? undefined : host,
    port: socketPath ? undefined : port,
    socketPath,
    user,
    password,
    database,
    ssl,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    dateStrings: true, // Return dates as strings to avoid automatic timezone conversions
    connectTimeout: 2000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  return mysql.createPool(config);
};

// Instantiated Composable Services
export const telemetryService = new TelemetryService();
export const healthMonitor = new HealthMonitor(telemetryService);
export const retryExecutor = new RetryExecutor();

// Instantiate Raw MySQL Connection Pool
const rawPool = createPool();
const originalGetConnection = rawPool.getConnection;
const originalQuery = rawPool.query;
const originalExecute = rawPool.execute;

// Background Health Probe Initialization (10s default)
healthMonitor.startHealthProbe(rawPool, envConfig.DB_HEALTH_PROBE_INTERVAL);

// Exposed Helper Functions
export async function checkDbHealthNow(): Promise<boolean> {
  return healthMonitor.checkHealthNow(rawPool);
}

export function startHealthProbe(intervalMs?: number): void {
  healthMonitor.startHealthProbe(rawPool, intervalMs);
}

export function stopHealthProbe(): void {
  healthMonitor.stopHealthProbe();
}

export function setDbOfflineState(offline: boolean): void {
  healthMonitor.setOfflineState(offline);
}

export function getDbHealthMetrics(): DbHealthMetrics {
  return telemetryService.getMetrics(healthMonitor.isOffline());
}

export function resetDbMetrics(): void {
  telemetryService.resetMetrics();
}

/**
 * Checks if a unit test has attached a mock implementation to the pool proxy target.
 */
function isTargetMocked(target: any): boolean {
  return (
    target.getConnection !== originalGetConnection ||
    target.query !== originalQuery ||
    target.execute !== originalExecute
  );
}

// Proxy Wrapper for Backward Compatibility
export const pool = new Proxy(rawPool, {
  get(target, prop, receiver) {
    if (prop === "_rawPool") {
      return rawPool;
    }
    if (prop === "isMocked") {
      return isTargetMocked(target);
    }
    if (prop === "execute" || prop === "query") {
      const orig = Reflect.get(target, prop, receiver);
      return async function(...args: any[]) {
        return retryExecutor.executeWithRetry(target, orig.bind(target), args, healthMonitor, telemetryService);
      };
    }
    if (prop === "getConnection") {
      const orig = Reflect.get(target, prop, receiver);
      return async function(...args: any[]) {
        telemetryService.recordConnectionAcquired();
        return orig.apply(target, args);
      };
    }
    if (prop === "end") {
      const orig = Reflect.get(target, prop, receiver);
      return async function(...args: any[]) {
        healthMonitor.stopHealthProbe();
        telemetryService.printTelemetrySummary();
        return orig.apply(target, args);
      };
    }
    return Reflect.get(target, prop, receiver);
  }
}) as any;

export const db = pool;
export default pool;
