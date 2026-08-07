/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Notification Analytics
 * Module: notification-hub/notification-analytics.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Produces delivery analytics snapshots: success rates, channel performance,
 * category volumes, and retry patterns. Read-only, stateless computation.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  NotificationAnalyticsSnapshot,
  NotificationChannel,
  NotificationCategory,
  NotificationStatus,
} from "./types.ts";
import type { IDeliveryTracker } from "./delivery-tracker.ts";

export interface INotificationAnalytics {
  generateSnapshot(periodStart: string, periodEnd: string): NotificationAnalyticsSnapshot;
  getChannelSuccessRate(channel: NotificationChannel, since?: string): number;
  getCategoryVolume(since?: string): Readonly<Record<NotificationCategory, number>>;
  getRetryPattern(): RetryPatternReport;
}

export interface RetryPatternReport {
  readonly totalRetried: number;
  readonly totalPermanentlyFailed: number;
  readonly avgAttemptsBeforeSuccess: number;
  readonly byChannel: Readonly<Record<string, { retried: number; failed: number }>>;
  readonly generatedAt: string;
}

export class NotificationAnalyticsService implements INotificationAnalytics {
  constructor(private readonly deliveryTracker: IDeliveryTracker) {}

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  public generateSnapshot(periodStart: string, periodEnd: string): NotificationAnalyticsSnapshot {
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd).getTime();

    const allStatuses: NotificationStatus[] = [
      "QUEUED", "BATCHED", "DIGESTED", "SENT", "DELIVERED",
      "FAILED", "RETRYING", "EXPIRED", "SUPPRESSED",
    ];

    const allRecords = this.deduplicateRecords(
      allStatuses.flatMap((s) => [...this.deliveryTracker.getByStatus(s)])
    ).filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start && t <= end;
    });

    let totalSent = 0;
    let totalFailed = 0;
    let totalSuppressed = 0;
    let totalAttempts = 0;
    const byChannel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const r of allRecords) {
      if (r.status === "SENT" || r.status === "DELIVERED") totalSent++;
      if (r.status === "FAILED") totalFailed++;
      if (r.status === "SUPPRESSED") totalSuppressed++;

      totalAttempts += r.attemptCount;
      byChannel[r.channel] = (byChannel[r.channel] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }

    const total = allRecords.length;
    const successRate = total > 0 ? totalSent / total : 0;
    const avgDeliveryAttempts = total > 0 ? totalAttempts / total : 0;

    return Object.freeze({
      snapshotId: randomUUID(),
      periodStart,
      periodEnd,
      totalSent,
      totalFailed,
      totalSuppressed,
      byChannel,
      byCategory,
      avgDeliveryAttempts: Math.round(avgDeliveryAttempts * 100) / 100,
      successRate: Math.round(successRate * 10000) / 10000,
      generatedAt: new Date().toISOString(),
    });
  }

  // ---------------------------------------------------------------------------
  // Channel Performance
  // ---------------------------------------------------------------------------

  public getChannelSuccessRate(channel: NotificationChannel, since?: string): number {
    const sent = [...this.deliveryTracker.getByStatus("SENT"),
                  ...this.deliveryTracker.getByStatus("DELIVERED")]
      .filter((r) => r.channel === channel)
      .filter((r) => !since || new Date(r.createdAt) >= new Date(since));

    const failed = [...this.deliveryTracker.getByStatus("FAILED")]
      .filter((r) => r.channel === channel)
      .filter((r) => !since || new Date(r.createdAt) >= new Date(since));

    const total = sent.length + failed.length;
    return total === 0 ? 1.0 : sent.length / total;
  }

  // ---------------------------------------------------------------------------
  // Category Volume
  // ---------------------------------------------------------------------------

  public getCategoryVolume(since?: string): Readonly<Record<NotificationCategory, number>> {
    const allStatuses: NotificationStatus[] = ["SENT", "DELIVERED", "FAILED", "SUPPRESSED"];
    const allRecords = this.deduplicateRecords(
      allStatuses.flatMap((s) => [...this.deliveryTracker.getByStatus(s)])
    ).filter((r) => !since || new Date(r.createdAt) >= new Date(since));

    const volume: Partial<Record<NotificationCategory, number>> = {};
    for (const r of allRecords) {
      volume[r.category] = (volume[r.category] ?? 0) + 1;
    }

    return volume as Readonly<Record<NotificationCategory, number>>;
  }

  // ---------------------------------------------------------------------------
  // Retry Pattern
  // ---------------------------------------------------------------------------

  public getRetryPattern(): RetryPatternReport {
    const retrying = [...this.deliveryTracker.getByStatus("RETRYING")];
    const failed = [...this.deliveryTracker.getByStatus("FAILED")];
    const sent = [...this.deliveryTracker.getByStatus("SENT"),
                  ...this.deliveryTracker.getByStatus("DELIVERED")]
      .filter((r) => r.attemptCount > 1);

    const byChannel: Record<string, { retried: number; failed: number }> = {};

    for (const r of [...retrying, ...sent]) {
      const ch = r.channel;
      byChannel[ch] = byChannel[ch] ?? { retried: 0, failed: 0 };
      byChannel[ch].retried++;
    }
    for (const r of failed) {
      const ch = r.channel;
      byChannel[ch] = byChannel[ch] ?? { retried: 0, failed: 0 };
      byChannel[ch].failed++;
    }

    const successRetried = sent.filter((r) => r.attemptCount > 1);
    const avgAttempts = successRetried.length > 0
      ? successRetried.reduce((sum, r) => sum + r.attemptCount, 0) / successRetried.length
      : 0;

    return {
      totalRetried: retrying.length + successRetried.length,
      totalPermanentlyFailed: failed.length,
      avgAttemptsBeforeSuccess: Math.round(avgAttempts * 100) / 100,
      byChannel,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private deduplicateRecords(records: any[]): any[] {
    const seen = new Set<string>();
    return records.filter((r) => {
      if (seen.has(r.notificationId)) return false;
      seen.add(r.notificationId);
      return true;
    });
  }
}
