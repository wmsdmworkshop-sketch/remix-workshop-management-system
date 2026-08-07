/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Queue Engine
 * Bounded Context: Core System / Queue Platform
 * Description: Coordinates queue operations (Enqueue, Dequeue, Peek, Transfer, etc.)
 *              utilizing tbl_notifications serializations.
 * =============================================================================
 */

import { pool as db } from "../../db/index";
import { QueueName } from "./queue-policy";
import { PriorityFactors, QueuePriority } from "./queue-priority";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export interface QueueItem {
  itemId: string;
  jobId: number;
  queueName: QueueName;
  status: "WAITING" | "PROCESSING" | "COMPLETED" | "SUSPENDED";
  factors: PriorityFactors;
  priorityScore: number;
  workshopId: number;
  branchId: number;
  entryTime: string;
  startedAt?: string;
  completedAt?: string;
  assignedStaffId?: number;
}

export class QueueEngine {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Enqueues a job card into a specific queue.
   */
  public async enqueue(
    itemId: string,
    jobId: number,
    queueName: QueueName,
    factors: PriorityFactors,
    context: { workshopId: number; branchId: number },
    correlationId: string
  ): Promise<void> {
    const priorityScore = QueuePriority.calculateScore(factors);

    const item: QueueItem = {
      itemId,
      jobId,
      queueName,
      status: "WAITING",
      factors,
      priorityScore,
      workshopId: context.workshopId,
      branchId: context.branchId,
      entryTime: new Date().toISOString(),
    };

    await this.save(item);

    await this.eventBus.publish(
      "QUEUE_ENQUEUED",
      { itemId, jobId, queueName, priorityScore, correlationId },
      makeSystemContext(correlationId)
    );
  }

  /**
   * Dequeues the highest priority item from a queue.
   */
  public async dequeue(
    queueName: QueueName,
    workshopId: number,
    assignedStaffId: number,
    correlationId: string
  ): Promise<QueueItem | null> {
    const items = await this.getQueueItems(queueName, workshopId);
    const eligible = items
      .filter((i) => i.status === "WAITING")
      .sort((a, b) => b.priorityScore - a.priorityScore);

    if (eligible.length === 0) return null;

    const item = eligible[0];
    item.status = "PROCESSING";
    item.startedAt = new Date().toISOString();
    item.assignedStaffId = assignedStaffId;

    await this.save(item);

    await this.eventBus.publish(
      "QUEUE_DEQUEUED",
      { itemId: item.itemId, jobId: item.jobId, queueName, assignedStaffId, correlationId },
      makeSystemContext(correlationId)
    );

    return item;
  }

  /**
   * Peeks at the next eligible queue item without changing its state.
   */
  public async peek(queueName: QueueName, workshopId: number): Promise<QueueItem | null> {
    const items = await this.getQueueItems(queueName, workshopId);
    const eligible = items
      .filter((i) => i.status === "WAITING")
      .sort((a, b) => b.priorityScore - a.priorityScore);

    return eligible.length > 0 ? eligible[0] : null;
  }

  /**
   * Transits a queue item from one queue name to another (Transfer).
   */
  public async transfer(
    itemId: string,
    targetQueue: QueueName,
    correlationId: string
  ): Promise<void> {
    const item = await this.get(itemId);
    if (item) {
      const sourceQueue = item.queueName;
      item.queueName = targetQueue;
      item.status = "WAITING";
      item.entryTime = new Date().toISOString(); // resets aging window on transfer
      item.priorityScore = QueuePriority.calculateScore(item.factors);
      await this.save(item);

      await this.eventBus.publish(
        "QUEUE_TRANSFERRED",
        { itemId, sourceQueue, targetQueue, correlationId },
        makeSystemContext(correlationId)
      );
    }
  }

  public async suspend(itemId: string, correlationId: string): Promise<void> {
    const item = await this.get(itemId);
    if (item && item.status === "WAITING") {
      item.status = "SUSPENDED";
      await this.save(item);
      await this.eventBus.publish("QUEUE_SUSPENDED", { itemId, correlationId }, makeSystemContext(correlationId));
    }
  }

  public async resume(itemId: string, correlationId: string): Promise<void> {
    const item = await this.get(itemId);
    if (item && item.status === "SUSPENDED") {
      item.status = "WAITING";
      await this.save(item);
      await this.eventBus.publish("QUEUE_RESUMED", { itemId, correlationId }, makeSystemContext(correlationId));
    }
  }

  public async reassign(itemId: string, staffId: number, correlationId: string): Promise<void> {
    const item = await this.get(itemId);
    if (item) {
      item.assignedStaffId = staffId;
      await this.save(item);
      await this.eventBus.publish("QUEUE_REASSIGNED", { itemId, staffId, correlationId }, makeSystemContext(correlationId));
    }
  }

  public async get(itemId: string): Promise<QueueItem | null> {
    const queryPattern = `%"itemId":"${itemId}"%`;
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_QUEUE_ITEM_METADATA' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (!rows || rows.length === 0) return null;
    return JSON.parse(rows[0].action_url) as QueueItem;
  }

  public async save(item: QueueItem): Promise<void> {
    const serialized = JSON.stringify(item);
    const queryPattern = `%"itemId":"${item.itemId}"%`;

    const [rows] = await db.execute(
      "SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_QUEUE_ITEM_METADATA' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (rows && rows.length > 0) {
      await db.execute(
        "UPDATE tbl_notifications SET action_url = ? WHERE notification_id = ?",
        [serialized, rows[0].notification_id]
      );
    } else {
      await db.execute(
        `INSERT INTO tbl_notifications 
         (user_id, notification_type, message, priority, related_job_id, action_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          1,
          "WOS_QUEUE_ITEM_METADATA",
          `Queue Item ${item.itemId} in ${item.queueName}`,
          "LOW",
          item.jobId,
          serialized,
        ]
      );
    }
  }

  public async getQueueItems(queueName: QueueName, workshopId: number): Promise<QueueItem[]> {
    const queryPattern = `%"queueName":"${queueName}"%`;
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_QUEUE_ITEM_METADATA' AND action_url LIKE ?",
      [queryPattern]
    ) as any[];

    const list: QueueItem[] = [];
    for (const r of rows) {
      try {
        const item = JSON.parse(r.action_url) as QueueItem;
        if (item.workshopId === workshopId) {
          list.push(item);
        }
      } catch (err) {
        // skip corrupt
      }
    }
    return list;
  }

  public async getAllItems(): Promise<QueueItem[]> {
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_QUEUE_ITEM_METADATA'"
    ) as any[];

    const list: QueueItem[] = [];
    for (const r of rows) {
      try {
        list.push(JSON.parse(r.action_url) as QueueItem);
      } catch (err) {
        // skip corrupt
      }
    }
    return list;
  }
}
