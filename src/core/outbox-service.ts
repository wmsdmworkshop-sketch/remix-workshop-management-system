/**
 * =============================================================================
 * WOS Core Architecture: Transactional Outbox Service
 * Bounded Context: Core System / Notifications
 * Description: Ensures transactional alignment of notification dispatches.
 *              Notifications are staged in-transaction and processed post-commit.
 * =============================================================================
 */

import { NotificationQueue } from "./notification-queue";
import { HardenedEnvelope } from "./notification-metadata";
import { NotificationEngine } from "./notification-engine";
import { CircuitBreaker } from "./circuit-breaker";
import { DeadLetterQueue } from "./dead-letter-queue";

export class OutboxService {
  private processing = false;

  constructor(
    private readonly engine: NotificationEngine,
    private readonly circuitBreaker: CircuitBreaker
  ) {}

  /**
   * Stages a notification inside the active database transaction scope.
   */
  public async stageNotification(
    envelope: HardenedEnvelope,
    txConnection: any
  ): Promise<void> {
    // Check idempotency first within transaction
    const exists = await NotificationQueue.exists(envelope.idempotencyKey, txConnection);
    if (exists) {
      console.warn(`[OutboxService] Duplicate notification rejected inside transaction: ${envelope.idempotencyKey}`);
      throw new Error(`Duplicate notification idempotency block: ${envelope.idempotencyKey}`);
    }

    // Enqueue in db using transaction connection
    await NotificationQueue.enqueue(envelope, txConnection);
  }

  /**
   * Background polling worker that processes enqueued outbox messages.
   */
  public async processOutbox(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pendingJobs = await NotificationQueue.getPendingJobs();

      for (const job of pendingJobs) {
        const { id, envelope } = job;
        const provider = envelope.primaryChannel;

        // 1. Check Circuit Breaker status
        if (!this.circuitBreaker.canExecute(provider)) {
          // Fail fast and route directly to DLQ
          envelope.status = "DeadLetter";
          await NotificationQueue.updateStatus(id, envelope);
          await DeadLetterQueue.route(
            envelope,
            "Circuit Breaker open for provider",
            "CIRCUIT_BREAKER_TRIPPED",
            provider
          );
          continue;
        }

        // 2. Update status to Processing
        envelope.status = "Processing";
        envelope.attempts += 1;
        envelope.lastAttemptedAt = new Date().toISOString();
        await NotificationQueue.updateStatus(id, envelope);

        // 3. Dispatch via NotificationEngine
        try {
          const success = await this.engine.sendNotification(
            {
              recipient: envelope.recipient,
              templateCode: envelope.templateCode,
              variables: envelope.variables,
              priority: envelope.context.priority,
              primaryChannel: envelope.primaryChannel,
              escalationChannel: envelope.escalationChannel,
            },
            envelope.correlationId
          );

          if (success) {
            envelope.status = "Delivered";
            this.circuitBreaker.recordSuccess(provider);
            await NotificationQueue.updateStatus(id, envelope);
          } else {
            await this.handleFailure(id, envelope, "Provider returned false", provider);
          }
        } catch (err: any) {
          await this.handleFailure(id, envelope, err.message || "Execution exception", provider);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async handleFailure(
    id: number,
    envelope: HardenedEnvelope,
    errorMsg: string,
    provider: string
  ): Promise<void> {
    this.circuitBreaker.recordFailure(provider);

    if (envelope.attempts >= envelope.maxAttempts) {
      envelope.status = "DeadLetter";
      await NotificationQueue.updateStatus(id, envelope);
      await DeadLetterQueue.route(envelope, "Max retry attempts exceeded", errorMsg, provider);
    } else {
      envelope.status = "Failed"; // leaves it in queue for next poll retry
      await NotificationQueue.updateStatus(id, envelope);
    }
  }
}
