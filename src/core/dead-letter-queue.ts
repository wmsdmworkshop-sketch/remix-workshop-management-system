/**
 * =============================================================================
 * WOS Core Architecture: DeadLetterQueue Implementation
 * Bounded Context: Core System / Resiliency Patterns
 * Description: Stores failed notifications that exceeded retry thresholds for
 *              compliance auditing and manual diagnostics.
 * =============================================================================
 */

import { pool as db } from "../db/index";
import { HardenedEnvelope } from "./notification-metadata";

export class DeadLetterQueue {
  /**
   * Routes a failed notification envelope to the database DeadLetterQueue record.
   * Preserves backward compatibility by serializing DLQ metadata in the action_url column.
   */
  public static async route(
    envelope: HardenedEnvelope,
    reason: string,
    exception: string,
    provider: string
  ): Promise<void> {
    const dlqEnvelope: HardenedEnvelope = {
      ...envelope,
      status: "DeadLetter",
      dlqReason: reason,
      dlqException: exception,
      dlqProvider: provider,
      lastAttemptedAt: new Date().toISOString(),
    };

    console.error(`[DeadLetterQueue] Routing failed message to DLQ. IdempotencyKey: ${envelope.idempotencyKey}. Reason: ${reason}`);

    // Persist to tbl_notifications with type 'DLQ_FAIL'
    // Serializes DLQ metadata to action_url for backwards compatibility preservation
    await db.execute(
      `INSERT INTO tbl_notifications 
       (user_id, notification_type, message, priority, related_job_id, action_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        envelope.context.supervisorId || 1, // escalate to supervisor or default admin
        "DLQ_FAIL",
        `[DLQ] ${envelope.templateCode} dispatch failure for user ${envelope.recipient}`,
        envelope.context.priority,
        envelope.context.jobCardId,
        JSON.stringify(dlqEnvelope),
      ]
    );
  }
}
