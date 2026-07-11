/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Queue Manager
 * Bounded Context: Core System / Queue Platform
 * Description: Manages access, merging, and splitting of queues.
 * =============================================================================
 */

import { QueueEngine, QueueItem } from "./queue-engine";
import { QueueName } from "./queue-policy";

export class QueueManager {
  constructor(private readonly engine: QueueEngine) {}

  public async getQueue(queueName: QueueName, workshopId: number): Promise<QueueItem[]> {
    return this.engine.getQueueItems(queueName, workshopId);
  }

  /**
   * Merges two queues into one target queue.
   */
  public async mergeQueues(
    sourceA: QueueName,
    sourceB: QueueName,
    target: QueueName,
    workshopId: number,
    correlationId: string
  ): Promise<void> {
    const itemsA = await this.engine.getQueueItems(sourceA, workshopId);
    const itemsB = await this.engine.getQueueItems(sourceB, workshopId);

    for (const item of [...itemsA, ...itemsB]) {
      await this.engine.transfer(item.itemId, target, correlationId);
    }
  }

  /**
   * Splits a queue into two based on priority score thresholds.
   */
  public async splitQueue(
    source: QueueName,
    targetHigh: QueueName,
    targetLow: QueueName,
    thresholdScore: number,
    workshopId: number,
    correlationId: string
  ): Promise<void> {
    const items = await this.engine.getQueueItems(source, workshopId);

    for (const item of items) {
      const target = item.priorityScore >= thresholdScore ? targetHigh : targetLow;
      await this.engine.transfer(item.itemId, target, correlationId);
    }
  }
}
