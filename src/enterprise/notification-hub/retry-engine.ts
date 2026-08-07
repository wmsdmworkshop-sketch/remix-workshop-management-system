/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Retry Engine
 * Module: notification-hub/retry-engine.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Exponential backoff retry engine for failed notification deliveries.
 * Integrates with DeliveryTracker for status updates.
 * Works with the frozen Kernel CircuitBreaker for provider health.
 * =============================================================================
 */

import type { RetryPolicy, NotificationRecord, NotificationChannel } from "./types.ts";
import type { IDeliveryTracker } from "./delivery-tracker.ts";
import type { IChannelRegistry } from "./channel-registry.ts";

export interface IRetryEngine {
  scheduleRetry(record: NotificationRecord): RetryScheduleResult;
  processRetries(): Promise<RetryBatchResult>;
  getPolicy(channel: NotificationChannel): RetryPolicy;
  overridePolicy(channel: NotificationChannel, policy: RetryPolicy): void;
}

export interface RetryScheduleResult {
  readonly notificationId: string;
  readonly willRetry: boolean;
  readonly nextRetryAt: string | undefined;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly reason: string;
}

export interface RetryBatchResult {
  readonly processed: number;
  readonly succeeded: number;
  readonly permanentlyFailed: number;
  readonly rescheduled: number;
  readonly processedAt: string;
}

/** Default retry policies per channel (matching SLA requirements from DWIP-V1-ARCH-011) */
const DEFAULT_RETRY_POLICIES: Readonly<Record<NotificationChannel, RetryPolicy>> = {
  IN_APP:   { maxAttempts: 3, initialDelayMs: 5_000,   backoffMultiplier: 2, maxDelayMs: 60_000   },
  SMS:      { maxAttempts: 5, initialDelayMs: 30_000,  backoffMultiplier: 2, maxDelayMs: 300_000  },
  WHATSAPP: { maxAttempts: 3, initialDelayMs: 30_000,  backoffMultiplier: 2, maxDelayMs: 300_000  },
  EMAIL:    { maxAttempts: 5, initialDelayMs: 60_000,  backoffMultiplier: 3, maxDelayMs: 900_000  },
  PUSH:     { maxAttempts: 3, initialDelayMs: 10_000,  backoffMultiplier: 2, maxDelayMs: 120_000  },
  VOICE:    { maxAttempts: 2, initialDelayMs: 120_000, backoffMultiplier: 2, maxDelayMs: 600_000  },
};

export class RetryEngine implements IRetryEngine {
  private readonly policies = new Map<NotificationChannel, RetryPolicy>(
    Object.entries(DEFAULT_RETRY_POLICIES) as [NotificationChannel, RetryPolicy][]
  );

  constructor(
    private readonly deliveryTracker: IDeliveryTracker,
    private readonly channelRegistry: IChannelRegistry
  ) {}

  // ---------------------------------------------------------------------------
  // Schedule
  // ---------------------------------------------------------------------------

  public scheduleRetry(record: NotificationRecord): RetryScheduleResult {
    const policy = this.getPolicy(record.channel);

    if (record.attemptCount >= policy.maxAttempts) {
      this.deliveryTracker.recordFailed(
        record.notificationId,
        `Maximum retry attempts (${policy.maxAttempts}) reached.`
      );
      return {
        notificationId: record.notificationId,
        willRetry: false,
        nextRetryAt: undefined,
        attemptNumber: record.attemptCount,
        maxAttempts: policy.maxAttempts,
        reason: "Maximum retry attempts reached. Notification permanently failed.",
      };
    }

    const delay = this.calculateDelay(record.attemptCount, policy);
    const nextRetryAt = new Date(Date.now() + delay).toISOString();

    this.deliveryTracker.recordFailed(
      record.notificationId,
      `Delivery failed on attempt ${record.attemptCount + 1}. Scheduled retry.`,
      nextRetryAt
    );

    return {
      notificationId: record.notificationId,
      willRetry: true,
      nextRetryAt,
      attemptNumber: record.attemptCount + 1,
      maxAttempts: policy.maxAttempts,
      reason: `Retry attempt ${record.attemptCount + 1} of ${policy.maxAttempts} scheduled at ${nextRetryAt}.`,
    };
  }

  // ---------------------------------------------------------------------------
  // Process (called by scheduler or background job)
  // ---------------------------------------------------------------------------

  /**
   * Processes all notifications due for retry.
   * Attempts re-delivery via the channel provider.
   */
  public async processRetries(): Promise<RetryBatchResult> {
    const pending = this.deliveryTracker.getPendingRetries();
    let succeeded = 0;
    let permanentlyFailed = 0;
    let rescheduled = 0;

    for (const record of pending) {
      const provider = this.channelRegistry.getProvider(record.channel);

      if (!provider) {
        this.scheduleRetry(record);
        rescheduled++;
        continue;
      }

      try {
        const available = await provider.isAvailable();
        if (!available) {
          this.scheduleRetry(record);
          rescheduled++;
          continue;
        }

        // Attempt re-delivery (address from record body context)
        const delivered = await provider.send(
          record.recipientId,
          undefined,
          record.body,
          record.priority,
          record.correlationId
        );

        if (delivered) {
          this.deliveryTracker.recordSent(record.notificationId, new Date().toISOString());
          succeeded++;
        } else {
          const result = this.scheduleRetry(record);
          result.willRetry ? rescheduled++ : permanentlyFailed++;
        }
      } catch (err: any) {
        const result = this.scheduleRetry(record);
        result.willRetry ? rescheduled++ : permanentlyFailed++;
      }
    }

    return {
      processed: pending.length,
      succeeded,
      permanentlyFailed,
      rescheduled,
      processedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Policy Management
  // ---------------------------------------------------------------------------

  public getPolicy(channel: NotificationChannel): RetryPolicy {
    return this.policies.get(channel) ?? DEFAULT_RETRY_POLICIES.IN_APP;
  }

  public overridePolicy(channel: NotificationChannel, policy: RetryPolicy): void {
    if (policy.maxAttempts < 1 || policy.maxAttempts > 10) {
      throw new Error("[RetryEngine] maxAttempts must be between 1 and 10.");
    }
    if (policy.backoffMultiplier < 1) {
      throw new Error("[RetryEngine] backoffMultiplier must be >= 1.");
    }
    this.policies.set(channel, Object.freeze({ ...policy }));
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private calculateDelay(attemptCount: number, policy: RetryPolicy): number {
    const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptCount);
    return Math.min(delay, policy.maxDelayMs);
  }
}
