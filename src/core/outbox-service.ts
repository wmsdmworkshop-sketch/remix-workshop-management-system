/**
 * =============================================================================
 * WOS Core Architecture: Transactional Outbox Service (Generic)
 * Bounded Context: Core System / Event Integration
 * Description: Ensures transactional alignment of domain events.
 *              Events are staged in-transaction and processed post-commit.
 * =============================================================================
 */

import { pool as db } from "../db/index.js";
import { globalEventBus, DomainEventEnvelope } from "./event-bus.js";

export class OutboxService {
  private processing = false;

  /**
   * Stages an event inside the active database transaction scope.
   */
  public async stageEvent(
    envelope: DomainEventEnvelope,
    txConnection?: any
  ): Promise<void> {
    const conn = txConnection || db;
    const serialized = JSON.stringify(envelope);

    await conn.execute(
      `INSERT INTO tbl_event_outbox (event_id, topic, payload, status, retry_count) VALUES (?, ?, ?, ?, ?)`,
      [envelope.eventId, envelope.topic, serialized, "PENDING", 0]
    );
  }

  /**
   * Background polling worker that processes enqueued outbox messages.
   */
  public async processOutbox(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Fetch up to 50 pending events
      const [rows] = await db.execute(
        `SELECT event_id, topic, payload, retry_count FROM tbl_event_outbox WHERE status = 'PENDING' OR status = 'RETRYING' ORDER BY created_at ASC LIMIT 50`
      ) as any[];

      for (const row of rows) {
        const eventId = row.event_id;
        const topic = row.topic;
        const retryCount = row.retry_count;
        
        let envelope: DomainEventEnvelope;
        try {
          envelope = JSON.parse(row.payload);
        } catch (err) {
          console.error(`[OutboxService] Failed to parse payload for event ${eventId}`);
          await this.updateStatus(eventId, "FAILED");
          continue;
        }

        try {
          // Dispatch via EventBus directly using internal dispatch to handlers
          // (assuming publish would recreate the envelope, we want to route directly)
          await globalEventBus.dispatchEnvelope(envelope);
          
          await this.updateStatus(eventId, "PROCESSED");
        } catch (err: any) {
          console.error(`[OutboxService] Error processing event ${eventId}:`, err.message);
          if (retryCount >= 3) {
            await this.updateStatus(eventId, "FAILED");
          } else {
            await db.execute(
              `UPDATE tbl_event_outbox SET status = 'RETRYING', retry_count = retry_count + 1 WHERE event_id = ?`,
              [eventId]
            );
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async updateStatus(eventId: string, status: string): Promise<void> {
    await db.execute(
      `UPDATE tbl_event_outbox SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE event_id = ?`,
      [status, eventId]
    );
  }
}

export const globalOutboxService = new OutboxService();
