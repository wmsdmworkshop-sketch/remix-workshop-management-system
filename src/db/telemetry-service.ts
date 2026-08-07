/**
 * =============================================================================
 * DWIP Enterprise Platform — Database Telemetry Service (WP-05)
 * Bounded Context: Persistence / Telemetry & Metrics
 * Description: Manages query performance metrics, health check timestamps,
 *              latency calculations, and failure/retry counters.
 * =============================================================================
 */

export interface DbHealthMetrics {
  readonly isOffline: boolean;
  readonly queriesRun: number;
  readonly queriesFailed: number;
  readonly queriesRetried: number;
  readonly connectionsAcquired: number;
  readonly recoveriesAttempted: number;
  readonly recoveriesSucceeded: number;
  readonly lastHealthCheckTime: string | null;
  readonly lastHealthCheckStatus: 'HEALTHY' | 'UNHEALTHY' | 'NOT_RUN';
  readonly lastQueryLatencyMs: number;
}

export class TelemetryService {
  private startTime = Date.now();
  private firstQueryTime: number | null = null;
  private firstQuerySql: string | null = null;
  private lastQueryTime: number | null = null;
  private lastQuerySql: string | null = null;

  private queriesRun = 0;
  private queriesFailed = 0;
  private queriesRetried = 0;
  private connectionsAcquired = 0;
  private recoveriesAttempted = 0;
  private recoveriesSucceeded = 0;
  private lastQueryLatencyMs = 0;

  private lastHealthCheckTime: string | null = null;
  private lastHealthCheckStatus: 'HEALTHY' | 'UNHEALTHY' | 'NOT_RUN' = 'NOT_RUN';

  public recordQuerySuccess(sql: string, latencyMs: number): void {
    this.queriesRun++;
    this.lastQueryLatencyMs = latencyMs;
    const now = Date.now();
    if (!this.firstQueryTime) {
      this.firstQueryTime = now;
      this.firstQuerySql = sql;
    }
    this.lastQueryTime = now;
    this.lastQuerySql = sql;
  }

  public recordQueryFailure(): void {
    this.queriesFailed++;
  }

  public recordQueryRetry(): void {
    this.queriesRetried++;
  }

  public recordConnectionAcquired(): void {
    this.connectionsAcquired++;
  }

  public recordHealthCheckAttempt(): void {
    this.recoveriesAttempted++;
    this.lastHealthCheckTime = new Date().toISOString();
  }

  public recordHealthCheckStatus(status: 'HEALTHY' | 'UNHEALTHY'): void {
    this.lastHealthCheckStatus = status;
  }

  public recordRecoverySuccess(): void {
    this.recoveriesSucceeded++;
  }

  public getMetrics(isOffline: boolean): DbHealthMetrics {
    return Object.freeze({
      isOffline,
      queriesRun: this.queriesRun,
      queriesFailed: this.queriesFailed,
      queriesRetried: this.queriesRetried,
      connectionsAcquired: this.connectionsAcquired,
      recoveriesAttempted: this.recoveriesAttempted,
      recoveriesSucceeded: this.recoveriesSucceeded,
      lastHealthCheckTime: this.lastHealthCheckTime,
      lastHealthCheckStatus: this.lastHealthCheckStatus,
      lastQueryLatencyMs: this.lastQueryLatencyMs,
    });
  }

  public resetMetrics(): void {
    this.queriesRun = 0;
    this.queriesFailed = 0;
    this.queriesRetried = 0;
    this.connectionsAcquired = 0;
    this.recoveriesAttempted = 0;
    this.recoveriesSucceeded = 0;
    this.lastQueryLatencyMs = 0;
    this.firstQueryTime = null;
    this.firstQuerySql = null;
    this.lastQueryTime = null;
    this.lastQuerySql = null;
  }

  public printTelemetrySummary(): void {
    const endTime = Date.now();
    console.log("\n========================================");
    console.log("=== DB CONNECTION POOL INSTRUMENTATION ===");
    console.log("========================================");
    console.log(`Start Time:           ${new Date(this.startTime).toISOString()}`);
    console.log(`End Time:             ${new Date(endTime).toISOString()}`);
    console.log(`Total Execution Time: ${endTime - this.startTime} ms`);
    console.log(`Queries Executed:     ${this.queriesRun}`);
    console.log(`Queries Failed:       ${this.queriesFailed}`);
    console.log(`Queries Retried:      ${this.queriesRetried}`);
    console.log(`Connections Acquired: ${this.connectionsAcquired}`);
    console.log(`Recoveries Attempted: ${this.recoveriesAttempted}`);
    console.log(`Recoveries Succeeded: ${this.recoveriesSucceeded}`);
    if (this.firstQueryTime) {
      console.log(`First Query Time:     ${new Date(this.firstQueryTime).toISOString()}`);
      console.log(`First Query SQL:      ${this.firstQuerySql}`);
    }
    if (this.lastQueryTime) {
      console.log(`Last Query Time:      ${new Date(this.lastQueryTime).toISOString()}`);
      console.log(`Last Query SQL:       ${this.lastQuerySql}`);
    }
    console.log("========================================\n");
  }
}
