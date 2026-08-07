/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Notification History
 * Module: notification-hub/notification-history.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Queryable history store for all notification records.
 * Provides filtering by recipient, status, date range, category, and channel.
 * =============================================================================
 */

import type {
  NotificationRecord,
  NotificationStatus,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from "./types.ts";
import type { IDeliveryTracker } from "./delivery-tracker.ts";

export interface NotificationHistoryQuery {
  recipientId?: string;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  correlationId?: string;
  since?: string; // ISO-8601
  until?: string; // ISO-8601
  limit?: number;
  offset?: number;
}

export interface NotificationHistoryPage {
  readonly records: ReadonlyArray<NotificationRecord>;
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

export interface INotificationHistory {
  query(query: NotificationHistoryQuery): NotificationHistoryPage;
  getForCorrelation(correlationId: string): ReadonlyArray<NotificationRecord>;
  getSummary(recipientId: string): RecipientNotificationSummary;
}

export interface RecipientNotificationSummary {
  readonly recipientId: string;
  readonly totalSent: number;
  readonly totalFailed: number;
  readonly lastNotificationAt: string | undefined;
  readonly byChannel: Readonly<Record<string, number>>;
  readonly byCategory: Readonly<Record<string, number>>;
}

export class NotificationHistoryService implements INotificationHistory {
  constructor(private readonly deliveryTracker: IDeliveryTracker) {}

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  public query(q: NotificationHistoryQuery): NotificationHistoryPage {
    const limit = Math.min(q.limit ?? 50, 200);
    const offset = q.offset ?? 0;

    // Gather all records from all statuses and filter
    const allStatuses: NotificationStatus[] = [
      "QUEUED", "BATCHED", "DIGESTED", "SENT", "DELIVERED",
      "FAILED", "RETRYING", "EXPIRED", "SUPPRESSED",
    ];

    let records: NotificationRecord[] = [];
    for (const status of allStatuses) {
      records.push(...this.deliveryTracker.getByStatus(status));
    }

    // Deduplicate by notificationId
    const seen = new Set<string>();
    records = records.filter((r) => {
      if (seen.has(r.notificationId)) return false;
      seen.add(r.notificationId);
      return true;
    });

    // Apply filters
    if (q.recipientId) {
      records = records.filter((r) => r.recipientId === q.recipientId);
    }
    if (q.status) {
      records = records.filter((r) => r.status === q.status);
    }
    if (q.channel) {
      records = records.filter((r) => r.channel === q.channel);
    }
    if (q.category) {
      records = records.filter((r) => r.category === q.category);
    }
    if (q.priority) {
      records = records.filter((r) => r.priority === q.priority);
    }
    if (q.correlationId) {
      records = records.filter((r) => r.correlationId === q.correlationId);
    }
    if (q.since) {
      const since = new Date(q.since).getTime();
      records = records.filter((r) => new Date(r.createdAt).getTime() >= since);
    }
    if (q.until) {
      const until = new Date(q.until).getTime();
      records = records.filter((r) => new Date(r.createdAt).getTime() <= until);
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = records.length;
    const page = records.slice(offset, offset + limit);

    return {
      records: page,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  // ---------------------------------------------------------------------------
  // Convenience
  // ---------------------------------------------------------------------------

  public getForCorrelation(correlationId: string): ReadonlyArray<NotificationRecord> {
    return this.query({ correlationId }).records;
  }

  public getSummary(recipientId: string): RecipientNotificationSummary {
    const all = this.deliveryTracker.getByRecipient(recipientId, 10_000);
    const byChannel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let lastAt: string | undefined;

    let totalSent = 0;
    let totalFailed = 0;

    for (const r of all) {
      if (r.status === "SENT" || r.status === "DELIVERED") totalSent++;
      if (r.status === "FAILED") totalFailed++;

      byChannel[r.channel] = (byChannel[r.channel] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

      if (!lastAt || new Date(r.createdAt) > new Date(lastAt)) {
        lastAt = r.createdAt;
      }
    }

    return {
      recipientId,
      totalSent,
      totalFailed,
      lastNotificationAt: lastAt,
      byChannel,
      byCategory,
    };
  }
}
