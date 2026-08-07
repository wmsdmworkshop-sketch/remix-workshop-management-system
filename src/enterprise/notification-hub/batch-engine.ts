/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Batch Engine
 * Module: notification-hub/batch-engine.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Groups notifications for batch delivery to reduce provider API calls.
 * Used for LOW priority notifications where immediate delivery is not required.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  NotificationRecord,
  NotificationBatch,
  NotificationChannel,
  NotificationPriority,
} from "./types.ts";
import type { IDeliveryTracker } from "./delivery-tracker.ts";
import type { IChannelRegistry } from "./channel-registry.ts";

export interface IBatchEngine {
  add(record: NotificationRecord): void;
  flush(channel?: NotificationChannel): Promise<BatchFlushResult>;
  getPendingCount(channel?: NotificationChannel): number;
  getBatch(batchId: string): NotificationBatch | undefined;
  canBatch(record: NotificationRecord): boolean;
}

export interface BatchFlushResult {
  readonly flushedBatches: number;
  readonly totalNotifications: number;
  readonly succeededBatches: number;
  readonly failedBatches: number;
  readonly flushedAt: string;
}

/** Maximum size of a single batch per channel */
const MAX_BATCH_SIZE = 50;

/** Priorities eligible for batching (HIGH and CRITICAL are NOT batched) */
const BATCHABLE_PRIORITIES: NotificationPriority[] = ["LOW", "MEDIUM"];

export class BatchEngine implements IBatchEngine {
  /** channel → queued NotificationRecord[] */
  private readonly queues = new Map<NotificationChannel, NotificationRecord[]>();

  /** batchId → NotificationBatch */
  private readonly batches = new Map<string, NotificationBatch>();

  constructor(
    private readonly deliveryTracker: IDeliveryTracker,
    private readonly channelRegistry: IChannelRegistry
  ) {}

  // ---------------------------------------------------------------------------
  // Queue
  // ---------------------------------------------------------------------------

  public canBatch(record: NotificationRecord): boolean {
    return BATCHABLE_PRIORITIES.includes(record.priority) && record.channel !== "VOICE";
  }

  public add(record: NotificationRecord): void {
    if (!this.canBatch(record)) {
      throw new Error(
        `[BatchEngine] Notification "${record.notificationId}" (priority: ${record.priority}) is not eligible for batching.`
      );
    }
    const queue = this.queues.get(record.channel) ?? [];
    queue.push(record);
    this.queues.set(record.channel, queue);

    this.deliveryTracker.recordCreated({
      ...record,
      status: "BATCHED",
    } as NotificationRecord);
  }

  public getPendingCount(channel?: NotificationChannel): number {
    if (channel) {
      return this.queues.get(channel)?.length ?? 0;
    }
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  public getBatch(batchId: string): NotificationBatch | undefined {
    return this.batches.get(batchId);
  }

  // ---------------------------------------------------------------------------
  // Flush
  // ---------------------------------------------------------------------------

  /**
   * Flushes all queued notifications, grouped into batches of MAX_BATCH_SIZE.
   * If `channel` is provided, only that channel's queue is flushed.
   */
  public async flush(channel?: NotificationChannel): Promise<BatchFlushResult> {
    const channelsToFlush = channel
      ? [channel]
      : (Array.from(this.queues.keys()) as NotificationChannel[]);

    let flushedBatches = 0;
    let totalNotifications = 0;
    let succeededBatches = 0;
    let failedBatches = 0;

    for (const ch of channelsToFlush) {
      const queue = this.queues.get(ch);
      if (!queue || queue.length === 0) continue;

      // Split queue into batches
      const chunks = this.chunk(queue, MAX_BATCH_SIZE);
      this.queues.set(ch, []); // Clear queue

      for (const chunk of chunks) {
        const batch = this.createBatch(ch, chunk);
        this.batches.set(batch.batchId, batch);
        flushedBatches++;
        totalNotifications += chunk.length;

        const success = await this.deliverBatch(batch);
        success ? succeededBatches++ : failedBatches++;
      }
    }

    return {
      flushedBatches,
      totalNotifications,
      succeededBatches,
      failedBatches,
      flushedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private createBatch(
    channel: NotificationChannel,
    notifications: NotificationRecord[]
  ): NotificationBatch {
    return Object.freeze({
      batchId: randomUUID(),
      channel,
      notifications: [...notifications],
      createdAt: new Date().toISOString(),
      scheduledDeliveryAt: new Date().toISOString(),
      status: "PENDING",
    });
  }

  private async deliverBatch(batch: NotificationBatch): Promise<boolean> {
    const provider = this.channelRegistry.getProvider(batch.channel);
    if (!provider) {
      for (const record of batch.notifications) {
        this.deliveryTracker.recordFailed(
          record.notificationId,
          `No provider for channel "${batch.channel}" during batch flush.`
        );
      }
      this.batches.set(batch.batchId, { ...batch, status: "FAILED" });
      return false;
    }

    let allSucceeded = true;
    for (const record of batch.notifications) {
      try {
        const sent = await provider.send(
          record.recipientId,
          undefined,
          record.body,
          record.priority,
          record.correlationId
        );
        if (sent) {
          this.deliveryTracker.recordSent(record.notificationId, new Date().toISOString());
        } else {
          this.deliveryTracker.recordFailed(record.notificationId, "Batch provider returned false.");
          allSucceeded = false;
        }
      } catch (err: any) {
        this.deliveryTracker.recordFailed(record.notificationId, err.message);
        allSucceeded = false;
      }
    }

    this.batches.set(batch.batchId, {
      ...batch,
      status: allSucceeded ? "SENT" : "FAILED",
    });
    return allSucceeded;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
