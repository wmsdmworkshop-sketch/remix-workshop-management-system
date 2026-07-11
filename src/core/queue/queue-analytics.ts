/**
 * =============================================================================
 * WOS Core Architecture: Queue Analytics
 * Bounded Context: Core System / Queue Platform
 * Description: Compiles performance statistics of queues.
 * =============================================================================
 */

import { QueueEngine, QueueItem } from "./queue-engine";
import { QueueName } from "./queue-policy";

export interface QueueAnalyticsReport {
  queueName: QueueName;
  queueLength: number;
  averageWaitMinutes: number;
  averageProcessingMinutes: number;
  utilizationPct: number;
  maxAgingMinutes: number;
}

export class QueueAnalytics {
  constructor(private readonly engine: QueueEngine) {}

  /**
   * Compiles analytics for a single queue.
   */
  public async getQueueAnalytics(
    queueName: QueueName,
    workshopId: number
  ): Promise<QueueAnalyticsReport> {
    const items = await this.engine.getQueueItems(queueName, workshopId);

    let waitingCount = 0;
    let processingCount = 0;
    let totalWaitMs = 0;
    let waitSampleCount = 0;
    let totalProcessingMs = 0;
    let processingSampleCount = 0;
    let maxAgeMs = 0;

    const now = Date.now();

    for (const item of items) {
      if (item.status === "WAITING") {
        waitingCount++;
        const age = now - new Date(item.entryTime).getTime();
        if (age > maxAgeMs) maxAgeMs = age;
      } else if (item.status === "PROCESSING") {
        processingCount++;
        if (item.startedAt) {
          const waitDuration = new Date(item.startedAt).getTime() - new Date(item.entryTime).getTime();
          totalWaitMs += waitDuration;
          waitSampleCount++;
        }
      } else if (item.status === "COMPLETED") {
        if (item.startedAt && item.completedAt) {
          const procDuration = new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime();
          totalProcessingMs += procDuration;
          processingSampleCount++;
        }
      }
    }

    const averageWaitMinutes =
      waitSampleCount > 0 ? Math.round(totalWaitMs / waitSampleCount / 1000 / 60) : 0;
    const averageProcessingMinutes =
      processingSampleCount > 0 ? Math.round(totalProcessingMs / processingSampleCount / 1000 / 60) : 0;

    const totalCapacity = 100; // Mock total queue capacity
    const utilizationPct = Math.round(((waitingCount + processingCount) / totalCapacity) * 100);

    return {
      queueName,
      queueLength: waitingCount,
      averageWaitMinutes,
      averageProcessingMinutes,
      utilizationPct,
      maxAgingMinutes: Math.round(maxAgeMs / 1000 / 60),
    };
  }
}
