/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Digest Engine
 * Module: notification-hub/digest-engine.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Aggregates multiple notifications into a single digest summary.
 * Supports HOURLY, DAILY, WEEKLY frequencies.
 * Reduces notification fatigue for high-volume recipients.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  DigestBundle,
  DigestEntry,
  DigestFrequency,
  NotificationRecord,
  NotificationCategory,
} from "./types.ts";
import type { ITemplateManager } from "./template-manager.ts";
import type { IChannelRegistry } from "./channel-registry.ts";
import type { IDeliveryTracker } from "./delivery-tracker.ts";

export interface IDigestEngine {
  enqueue(record: NotificationRecord, summary: string): void;
  buildDigest(recipientId: string, frequency: DigestFrequency): DigestBundle | undefined;
  sendDigest(bundle: DigestBundle): Promise<DigestDeliveryResult>;
  getPendingCount(recipientId: string): number;
}

export interface DigestDeliveryResult {
  readonly digestId: string;
  readonly recipientId: string;
  readonly sent: boolean;
  readonly failureReason?: string;
  readonly sentAt: string;
}

export class DigestEngine implements IDigestEngine {
  /** recipientId → DigestEntry[] */
  private readonly queues = new Map<string, DigestEntry[]>();

  /** digestId → DigestBundle */
  private readonly bundles = new Map<string, DigestBundle>();

  constructor(
    private readonly templateManager: ITemplateManager,
    private readonly channelRegistry: IChannelRegistry,
    private readonly deliveryTracker: IDeliveryTracker
  ) {}

  // ---------------------------------------------------------------------------
  // Queue
  // ---------------------------------------------------------------------------

  public enqueue(record: NotificationRecord, summary: string): void {
    const entry: DigestEntry = Object.freeze({
      notificationId: record.notificationId,
      summary,
      category: record.category,
      createdAt: record.createdAt,
    });

    const queue = this.queues.get(record.recipientId) ?? [];
    queue.push(entry);
    this.queues.set(record.recipientId, queue);
  }

  public getPendingCount(recipientId: string): number {
    return this.queues.get(recipientId)?.length ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  public buildDigest(
    recipientId: string,
    frequency: DigestFrequency
  ): DigestBundle | undefined {
    const queue = this.queues.get(recipientId);
    if (!queue || queue.length === 0) return undefined;

    const { start, end } = this.getPeriodBounds(frequency);

    // Filter entries within the period
    const periodEntries = queue.filter((e) => {
      const createdAt = new Date(e.createdAt).getTime();
      return createdAt >= start.getTime() && createdAt <= end.getTime();
    });

    if (periodEntries.length === 0) return undefined;

    // Remove consumed entries from queue
    const remaining = queue.filter((e) => !periodEntries.includes(e));
    this.queues.set(recipientId, remaining);

    const bundle: DigestBundle = Object.freeze({
      digestId: randomUUID(),
      recipientId,
      entries: periodEntries,
      frequency,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    });

    this.bundles.set(bundle.digestId, bundle);
    return bundle;
  }

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------

  public async sendDigest(bundle: DigestBundle): Promise<DigestDeliveryResult> {
    const emailProvider = this.channelRegistry.getProvider("EMAIL");
    const sentAt = new Date().toISOString();

    if (!emailProvider) {
      this.bundles.set(bundle.digestId, { ...bundle, sentAt });
      return {
        digestId: bundle.digestId,
        recipientId: bundle.recipientId,
        sent: false,
        failureReason: "No EMAIL provider registered for digest delivery.",
        sentAt,
      };
    }

    // Build digest content
    const digestContent = bundle.entries
      .map((e, i) => `${i + 1}. [${e.category}] ${e.summary}`)
      .join("\n");

    const today = new Date().toLocaleDateString("en-IN");
    const template = this.templateManager.get("digest.daily.email", "EMAIL");

    let body = template
      ? this.templateManager.render(template.templateId, {
          recipient_name: bundle.recipientId,
          date: today,
          digest_content: digestContent,
        }).body
      : `Your DWIP digest for ${today}:\n\n${digestContent}`;

    try {
      const sent = await emailProvider.send(
        bundle.recipientId,
        `DWIP Digest — ${today}`,
        body,
        "LOW",
        randomUUID()
      );

      const updatedBundle: DigestBundle = { ...bundle, sentAt };
      this.bundles.set(bundle.digestId, updatedBundle);

      return {
        digestId: bundle.digestId,
        recipientId: bundle.recipientId,
        sent,
        failureReason: sent ? undefined : "Email provider returned false.",
        sentAt,
      };
    } catch (err: any) {
      return {
        digestId: bundle.digestId,
        recipientId: bundle.recipientId,
        sent: false,
        failureReason: err.message,
        sentAt,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getPeriodBounds(frequency: DigestFrequency): { start: Date; end: Date } {
    const now = new Date();
    const end = now;

    switch (frequency) {
      case "HOURLY":
        return { start: new Date(now.getTime() - 60 * 60 * 1000), end };
      case "DAILY":
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end };
      case "WEEKLY":
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end };
      case "IMMEDIATE":
      default:
        return { start: new Date(0), end }; // All pending
    }
  }
}
