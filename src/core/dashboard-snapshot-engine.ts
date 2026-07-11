/**
 * =============================================================================
 * WOS Core Architecture: DashboardSnapshotEngine Interface
 * Bounded Context: Core System / Analytics & UI Aggregates
 * Description: Generates cached high-performance snapshots of active queues,
 *              SLA compliance rates, and KPI summaries.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

export interface QueueSnapshot {
  queueName: string;
  activeCount: number;
  warnCount: number;
  breachCount: number;
}

export interface OperationalDashboardSnapshot {
  timestamp: string;
  totalActiveJobs: number;
  overallSlaCompliancePct: number;
  queues: QueueSnapshot[];
}

export interface IDashboardSnapshotEngine {
  readonly eventBus: IEventBus;

  /**
   * Fetches the current operational snapshot parameters.
   */
  getLatestSnapshot(correlationId: string): Promise<OperationalDashboardSnapshot>;

  /**
   * Refreshes the cached snapshot counters (typically triggered by events).
   */
  refreshCache(correlationId: string): Promise<void>;
}
