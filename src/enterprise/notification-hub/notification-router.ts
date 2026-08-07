/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Notification Router
 * Module: notification-hub/notification-router.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7.2 (Notification Routing)
 *
 * Orchestrator for the entire notification delivery pipeline:
 *   1. Resolve recipients
 *   2. Select channels (via ChannelSelector)
 *   3. Render templates (via TemplateManager)
 *   4. Route: batch/digest/immediate based on priority and preferences
 *   5. Dispatch via provider (via ChannelRegistry)
 *   6. Track delivery (via DeliveryTracker)
 *   7. Schedule retries on failure (via RetryEngine)
 *
 * This is the central orchestrator — it owns the pipeline composition.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  NotificationRequest,
  NotificationRecord,
  NotificationChannel,
  INotificationRouter,
} from "./types.ts";
import type { IChannelSelector } from "./channel-selector.ts";
import type { ITemplateManager } from "./template-manager.ts";
import type { IChannelRegistry } from "./channel-registry.ts";
import type { IDeliveryTracker } from "./delivery-tracker.ts";
import type { IRetryEngine } from "./retry-engine.ts";
import type { IBatchEngine } from "./batch-engine.ts";
import type { IPreferenceEngine } from "./preference-engine.ts";

export class NotificationRouter implements INotificationRouter {
  constructor(
    private readonly channelSelector: IChannelSelector,
    private readonly templateManager: ITemplateManager,
    private readonly channelRegistry: IChannelRegistry,
    private readonly deliveryTracker: IDeliveryTracker,
    private readonly retryEngine: IRetryEngine,
    private readonly batchEngine: IBatchEngine,
    private readonly preferenceEngine: IPreferenceEngine
  ) {}

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  /**
   * Routes a notification request through the full delivery pipeline.
   * Returns all NotificationRecords created (one per recipient × channel).
   */
  public async route(request: NotificationRequest): Promise<ReadonlyArray<NotificationRecord>> {
    this.validateRequest(request);

    const allRecords: NotificationRecord[] = [];

    for (const recipientId of request.recipientIds) {
      const recipientRecords = await this.routeForRecipient(request, recipientId);
      allRecords.push(...recipientRecords);
    }

    return allRecords;
  }

  // ---------------------------------------------------------------------------
  // Per-Recipient Pipeline
  // ---------------------------------------------------------------------------

  private async routeForRecipient(
    request: NotificationRequest,
    recipientId: string
  ): Promise<NotificationRecord[]> {
    const records: NotificationRecord[] = [];

    // 1. Check expiry
    if (request.expiresAt && new Date(request.expiresAt) <= new Date()) {
      const expired = this.createRecord(request, recipientId, "IN_APP", "", "EXPIRED");
      this.deliveryTracker.recordCreated(expired);
      this.deliveryTracker.recordExpired(expired.notificationId);
      records.push({ ...expired, status: "EXPIRED" } as NotificationRecord);
      return records;
    }

    // 2. Select channels
    const selection = this.channelSelector.select(request, recipientId);

    if (selection.selectedChannels.length === 0) {
      // All channels suppressed — record as suppressed
      const suppressed = this.createRecord(request, recipientId, "IN_APP", "", "SUPPRESSED");
      this.deliveryTracker.recordCreated(suppressed);
      this.deliveryTracker.recordSuppressed(
        suppressed.notificationId,
        Object.values(selection.suppressionReasons).join("; ")
      );
      records.push({ ...suppressed, status: "SUPPRESSED" } as NotificationRecord);
      return records;
    }

    // 3. Deliver per channel
    for (const channel of selection.selectedChannels) {
      const record = await this.deliverToChannel(request, recipientId, channel);
      records.push(record);
    }

    return records;
  }

  // ---------------------------------------------------------------------------
  // Channel Delivery
  // ---------------------------------------------------------------------------

  private async deliverToChannel(
    request: NotificationRequest,
    recipientId: string,
    channel: NotificationChannel
  ): Promise<NotificationRecord> {
    // Render template
    const template = this.templateManager.get(request.templateKey, channel);
    let body = "";
    let subject: string | undefined;

    if (template) {
      const rendered = this.templateManager.render(
        template.templateId,
        request.templateVariables as Record<string, string>
      );
      body = rendered.body;
      subject = rendered.subject;
    } else {
      // Graceful fallback: use raw template variables as body
      body = `Notification: ${request.category} — ${JSON.stringify(request.templateVariables)}`;
    }

    // Create record
    const record = this.createRecord(request, recipientId, channel, body, "QUEUED", subject);
    this.deliveryTracker.recordCreated(record);

    // Route decision: batch vs immediate
    if (request.allowBatch && this.batchEngine.canBatch(record)) {
      this.batchEngine.add(record);
      return { ...record, status: "BATCHED" } as NotificationRecord;
    }

    // Immediate delivery
    return await this.deliverImmediately(record);
  }

  private async deliverImmediately(record: NotificationRecord): Promise<NotificationRecord> {
    const provider = this.channelRegistry.getProvider(record.channel);

    if (!provider) {
      const scheduleResult = this.retryEngine.scheduleRetry(record);
      const status = scheduleResult.willRetry ? "RETRYING" : "FAILED";
      return { ...record, status } as NotificationRecord;
    }

    try {
      const available = await provider.isAvailable();
      if (!available) {
        const scheduleResult = this.retryEngine.scheduleRetry(record);
        return {
          ...record,
          status: scheduleResult.willRetry ? "RETRYING" : "FAILED",
        } as NotificationRecord;
      }

      const recipientAddress =
        this.preferenceEngine.getRecipientAddress(record.recipientId, record.channel) ??
        record.recipientId;

      const delivered = await provider.send(
        recipientAddress,
        record.subject,
        record.body,
        record.priority,
        record.correlationId
      );

      if (delivered) {
        const sentAt = new Date().toISOString();
        this.deliveryTracker.recordSent(record.notificationId, sentAt);
        return { ...record, status: "SENT", sentAt } as NotificationRecord;
      } else {
        const scheduleResult = this.retryEngine.scheduleRetry(record);
        return {
          ...record,
          status: scheduleResult.willRetry ? "RETRYING" : "FAILED",
        } as NotificationRecord;
      }
    } catch (err: any) {
      const scheduleResult = this.retryEngine.scheduleRetry(record);
      return {
        ...record,
        status: scheduleResult.willRetry ? "RETRYING" : "FAILED",
        failureReason: err.message,
      } as NotificationRecord;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private createRecord(
    request: NotificationRequest,
    recipientId: string,
    channel: NotificationChannel,
    body: string,
    status: NotificationRecord["status"],
    subject?: string
  ): NotificationRecord {
    const policy = this.retryEngine.getPolicy(channel);
    const now = new Date().toISOString();
    return Object.freeze({
      notificationId: randomUUID(),
      requestId: request.requestId,
      recipientId,
      channel,
      category: request.category,
      priority: request.priority,
      subject,
      body,
      status,
      correlationId: request.correlationId,
      createdAt: now,
      updatedAt: now,
      attemptCount: 0,
      maxAttempts: policy.maxAttempts,
    });
  }

  private validateRequest(request: NotificationRequest): void {
    if (!request.requestId) throw new Error("[NotificationRouter] requestId is required.");
    if (!request.correlationId) throw new Error("[NotificationRouter] correlationId is required.");
    if (!request.recipientIds || request.recipientIds.length === 0) {
      throw new Error("[NotificationRouter] At least one recipientId is required.");
    }
    if (!request.templateKey) throw new Error("[NotificationRouter] templateKey is required.");
    if (!request.category) throw new Error("[NotificationRouter] category is required.");
    if (!request.priority) throw new Error("[NotificationRouter] priority is required.");
  }
}
