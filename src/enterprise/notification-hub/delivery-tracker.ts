/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Delivery Tracker
 * Module: notification-hub/delivery-tracker.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Tracks delivery status of every notification record.
 * Provides status queries and update methods for the retry/router pipeline.
 * Single Responsibility: status lifecycle management only.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  NotificationRecord,
  NotificationStatus,
  DeliveryEvent,
  DeliveryEventType,
  NotificationChannel,
} from "./types.ts";

export interface IDeliveryTracker {
  recordCreated(record: NotificationRecord): void;
  recordSent(notificationId: string, sentAt: string): NotificationRecord | undefined;
  recordFailed(notificationId: string, reason: string, nextRetryAt?: string): NotificationRecord | undefined;
  recordExpired(notificationId: string): NotificationRecord | undefined;
  recordSuppressed(notificationId: string, reason: string): NotificationRecord | undefined;
  get(notificationId: string): NotificationRecord | undefined;
  getByRequestId(requestId: string): ReadonlyArray<NotificationRecord>;
  getByRecipient(recipientId: string, limit?: number): ReadonlyArray<NotificationRecord>;
  getByStatus(status: NotificationStatus): ReadonlyArray<NotificationRecord>;
  getDeliveryEvents(notificationId: string): ReadonlyArray<DeliveryEvent>;
  getPendingRetries(): ReadonlyArray<NotificationRecord>;
}

export class DeliveryTracker implements IDeliveryTracker {
  private readonly records = new Map<string, NotificationRecord>();
  private readonly events: DeliveryEvent[] = [];

  // ---------------------------------------------------------------------------
  // Write: Status Transitions
  // ---------------------------------------------------------------------------

  public recordCreated(record: NotificationRecord): void {
    this.records.set(record.notificationId, Object.freeze({ ...record }));
  }

  public recordSent(notificationId: string, sentAt: string): NotificationRecord | undefined {
    return this.transition(notificationId, "SENT", "SENT", { sentAt });
  }

  public recordFailed(
    notificationId: string,
    reason: string,
    nextRetryAt?: string
  ): NotificationRecord | undefined {
    const existing = this.records.get(notificationId);
    if (!existing) return undefined;

    const willRetry = existing.attemptCount < existing.maxAttempts;
    const newStatus: NotificationStatus = willRetry ? "RETRYING" : "FAILED";

    return this.transition(notificationId, newStatus, willRetry ? "RETRYING" : "FAILED", {
      failureReason: reason,
      nextRetryAt,
      attemptCount: existing.attemptCount + 1,
    });
  }

  public recordExpired(notificationId: string): NotificationRecord | undefined {
    return this.transition(notificationId, "EXPIRED", "EXPIRED");
  }

  public recordSuppressed(notificationId: string, reason: string): NotificationRecord | undefined {
    return this.transition(notificationId, "SUPPRESSED", "SUPPRESSED", {
      failureReason: reason,
    });
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public get(notificationId: string): NotificationRecord | undefined {
    return this.records.get(notificationId);
  }

  public getByRequestId(requestId: string): ReadonlyArray<NotificationRecord> {
    return Array.from(this.records.values()).filter((r) => r.requestId === requestId);
  }

  public getByRecipient(recipientId: string, limit: number = 50): ReadonlyArray<NotificationRecord> {
    return Array.from(this.records.values())
      .filter((r) => r.recipientId === recipientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public getByStatus(status: NotificationStatus): ReadonlyArray<NotificationRecord> {
    return Array.from(this.records.values()).filter((r) => r.status === status);
  }

  public getDeliveryEvents(notificationId: string): ReadonlyArray<DeliveryEvent> {
    return this.events.filter((e) => e.notificationId === notificationId);
  }

  public getPendingRetries(): ReadonlyArray<NotificationRecord> {
    const now = new Date();
    return Array.from(this.records.values()).filter(
      (r) =>
        r.status === "RETRYING" &&
        r.nextRetryAt !== undefined &&
        new Date(r.nextRetryAt) <= now
    );
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private transition(
    notificationId: string,
    newStatus: NotificationStatus,
    eventType?: DeliveryEventType,
    overrides: Partial<NotificationRecord> = {}
  ): NotificationRecord | undefined {
    const existing = this.records.get(notificationId);
    if (!existing) return undefined;

    const updated: NotificationRecord = Object.freeze({
      ...existing,
      ...overrides,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    this.records.set(notificationId, updated);

    if (eventType) {
      this.emitEvent(notificationId, existing.channel, existing.recipientId, eventType, (overrides as any).failureReason);
    }

    return updated;
  }

  private emitEvent(
    notificationId: string,
    channel: NotificationChannel,
    recipientId: string,
    eventType: DeliveryEventType,
    details?: string
  ): void {
    this.events.push(
      Object.freeze({
        deliveryEventId: randomUUID(),
        notificationId,
        channel,
        recipientId,
        eventType,
        occurredAt: new Date().toISOString(),
        details,
      })
    );
  }
}
