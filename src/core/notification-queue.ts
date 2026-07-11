/**
 * =============================================================================
 * WOS Core Architecture: Persistent Notification Queue
 * Bounded Context: Core System / Notifications
 * Description: Manages queue persistence using tbl_notifications serializations
 *              to prevent schema mutation. Enforces idempotency checks.
 * =============================================================================
 */

import { pool as db } from "../db/index";
import { HardenedEnvelope } from "./notification-metadata";

export class NotificationQueue {
  /**
   * Enqueues a notification envelope into persistent DB storage.
   * Can accept an active transaction connection for transaction alignment.
   */
  public static async enqueue(
    envelope: HardenedEnvelope,
    txConnection?: any
  ): Promise<void> {
    const conn = txConnection || db;
    const serialized = JSON.stringify(envelope);

    await conn.execute(
      `INSERT INTO tbl_notifications 
       (user_id, notification_type, message, priority, related_job_id, action_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        envelope.context.supervisorId || 1,
        "WOS_QUEUE_ITEM",
        `Notification for ${envelope.recipient} via ${envelope.primaryChannel}`,
        envelope.context.priority,
        envelope.context.jobCardId,
        serialized,
      ]
    );
  }

  /**
   * Checks if an idempotency key has already been processed or enqueued.
   */
  public static async exists(idempotencyKey: string, txConnection?: any): Promise<boolean> {
    const conn = txConnection || db;
    const queryPattern = `%"idempotencyKey":"${idempotencyKey}"%`;

    const [rows] = await conn.execute(
      "SELECT COUNT(*) as count FROM tbl_notifications WHERE action_url LIKE ?",
      [queryPattern]
    ) as any[];

    return rows && rows[0].count > 0;
  }

  /**
   * Polls all pending ("Queued" or "Failed") notifications from the persistent store.
   */
  public static async getPendingJobs(): Promise<{ id: number; envelope: HardenedEnvelope }[]> {
    const queryPattern = '%"status":"Queued"%';
    const failPattern = '%"status":"Failed"%';

    const [rows] = await db.execute(
      `SELECT notification_id, action_url FROM tbl_notifications 
       WHERE notification_type = 'WOS_QUEUE_ITEM' 
       AND (action_url LIKE ? OR action_url LIKE ?)`,
      [queryPattern, failPattern]
    ) as any[];

    const jobs: { id: number; envelope: HardenedEnvelope }[] = [];
    for (const r of rows) {
      try {
        const envelope = JSON.parse(r.action_url) as HardenedEnvelope;
        jobs.push({ id: r.notification_id, envelope });
      } catch (err) {
        // Skip corrupt JSON rows
      }
    }
    return jobs;
  }

  /**
   * Updates status and metadata for a persistent queue item.
   */
  public static async updateStatus(
    dbId: number,
    envelope: HardenedEnvelope,
    txConnection?: any
  ): Promise<void> {
    const conn = txConnection || db;
    const serialized = JSON.stringify(envelope);

    await conn.execute(
      "UPDATE tbl_notifications SET action_url = ? WHERE notification_id = ?",
      [serialized, dbId]
    );
  }
}
