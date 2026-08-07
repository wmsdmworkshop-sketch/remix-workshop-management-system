import { envConfig } from "../config/env.ts";
import { TelemetryService } from "./telemetry-service.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Database Health Monitor (WP-05)
 * Bounded Context: Persistence / Health Monitoring & Self-Healing
 * Description: Executes lightweight SELECT 1 background health probes, manages
 *              online/offline state, and auto-recovers pool availability.
 * =============================================================================
 */

export class HealthMonitor {
  private dbIsOffline = false;
  private healthProbeTimer: NodeJS.Timeout | null = null;

  constructor(private telemetry: TelemetryService) {}

  public isOffline(): boolean {
    return this.dbIsOffline;
  }

  public setOfflineState(offline: boolean): void {
    const prevState = this.dbIsOffline;
    this.dbIsOffline = offline;

    if (offline && !prevState) {
      console.warn(`[DB_FAULT_INJECTION] Database pool state manually/automatically set to OFFLINE.`);
    } else if (!offline && prevState) {
      console.log(`[DB_STATE_RESET] Database pool state recovered to ONLINE.`);
    }
  }

  /**
   * Performs an immediate SELECT 1 probe against the raw pool.
   * Auto-heals dbIsOffline = false upon success.
   */
  public async checkHealthNow(rawPool: any): Promise<boolean> {
    this.telemetry.recordHealthCheckAttempt();
    const probeStartTime = Date.now();

    try {
      const timeoutMs = envConfig.DB_HEALTH_TIMEOUT || 10000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`ETIMEDOUT: Health probe timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      // Execute SELECT 1 directly on rawPool (bypassing proxy traps)
      await Promise.race([rawPool.query("SELECT 1"), timeoutPromise]);

      const probeLatency = Date.now() - probeStartTime;
      this.telemetry.recordHealthCheckStatus('HEALTHY');

      if (this.dbIsOffline) {
        this.dbIsOffline = false;
        this.telemetry.recordRecoverySuccess();
        console.log(`[DB_RECOVERY] Database connection RECOVERED successfully (probe latency: ${probeLatency}ms)`);
      }
      return true;
    } catch (err: any) {
      this.telemetry.recordHealthCheckStatus('UNHEALTHY');
      // Do not trip offline state in test mode unless explicitly forced
      if (!this.dbIsOffline && envConfig.NODE_ENV !== 'test') {
        this.dbIsOffline = true;
        console.warn(`[DB_FAULT] Health check probe failed; pool marked OFFLINE. Error: ${err.message}`);
      }
      return false;
    }
  }

  /**
   * Starts the automated background health probe.
   */
  public startHealthProbe(rawPool: any, intervalMs: number = envConfig.DB_HEALTH_PROBE_INTERVAL || 10000): void {
    if (this.healthProbeTimer) {
      clearInterval(this.healthProbeTimer);
    }
    this.healthProbeTimer = setInterval(async () => {
      await this.checkHealthNow(rawPool);
    }, intervalMs);

    if (this.healthProbeTimer.unref) {
      this.healthProbeTimer.unref();
    }
  }

  /**
   * Stops the background health probe.
   */
  public stopHealthProbe(): void {
    if (this.healthProbeTimer) {
      clearInterval(this.healthProbeTimer);
      this.healthProbeTimer = null;
    }
  }
}
