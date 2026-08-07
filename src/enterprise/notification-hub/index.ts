/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Barrel Export
 * Module: notification-hub/index.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 5 (Folder Structure)
 *
 * Single import point for the entire Notification Hub module.
 * Exports pre-wired singleton instances for monolith use.
 * =============================================================================
 */

// Types & Contracts
export * from "./types.ts";

// Services (exposed for DI / testing)
export { ChannelRegistry } from "./channel-registry.ts";
export type { IChannelRegistry, ChannelRegistration } from "./channel-registry.ts";

export { TemplateManager, PLATFORM_TEMPLATES } from "./template-manager.ts";
export type { ITemplateManager, RenderedTemplate } from "./template-manager.ts";

export { PreferenceEngine } from "./preference-engine.ts";
export type { IPreferenceEngine } from "./preference-engine.ts";

export { ChannelSelector } from "./channel-selector.ts";
export type { IChannelSelector, ChannelSelectionResult } from "./channel-selector.ts";

export { DeliveryTracker } from "./delivery-tracker.ts";
export type { IDeliveryTracker } from "./delivery-tracker.ts";

export { RetryEngine } from "./retry-engine.ts";
export type { IRetryEngine, RetryScheduleResult, RetryBatchResult } from "./retry-engine.ts";

export { BatchEngine } from "./batch-engine.ts";
export type { IBatchEngine, BatchFlushResult } from "./batch-engine.ts";

export { DigestEngine } from "./digest-engine.ts";
export type { IDigestEngine, DigestDeliveryResult } from "./digest-engine.ts";

export { NotificationHistoryService } from "./notification-history.ts";
export type {
  INotificationHistory,
  NotificationHistoryQuery,
  NotificationHistoryPage,
  RecipientNotificationSummary,
} from "./notification-history.ts";

export { NotificationAnalyticsService } from "./notification-analytics.ts";
export type {
  INotificationAnalytics,
  RetryPatternReport,
} from "./notification-analytics.ts";

export { NotificationRouter } from "./notification-router.ts";

// ---------------------------------------------------------------------------
// Pre-wired Singleton (monolith convenience)
// ---------------------------------------------------------------------------

import { ChannelRegistry } from "./channel-registry.ts";
import { TemplateManager } from "./template-manager.ts";
import { PreferenceEngine } from "./preference-engine.ts";
import { ChannelSelector } from "./channel-selector.ts";
import { DeliveryTracker } from "./delivery-tracker.ts";
import { RetryEngine } from "./retry-engine.ts";
import { BatchEngine } from "./batch-engine.ts";
import { DigestEngine } from "./digest-engine.ts";
import { NotificationHistoryService } from "./notification-history.ts";
import { NotificationAnalyticsService } from "./notification-analytics.ts";
import { NotificationRouter } from "./notification-router.ts";

const _channelRegistry = new ChannelRegistry();
const _templateManager = new TemplateManager();
const _preferenceEngine = new PreferenceEngine();
const _deliveryTracker = new DeliveryTracker();
const _channelSelector = new ChannelSelector(_channelRegistry, _preferenceEngine);
const _retryEngine = new RetryEngine(_deliveryTracker, _channelRegistry);
const _batchEngine = new BatchEngine(_deliveryTracker, _channelRegistry);
const _digestEngine = new DigestEngine(_templateManager, _channelRegistry, _deliveryTracker);
const _historyService = new NotificationHistoryService(_deliveryTracker);
const _analyticsService = new NotificationAnalyticsService(_deliveryTracker);

const _notificationRouter = new NotificationRouter(
  _channelSelector,
  _templateManager,
  _channelRegistry,
  _deliveryTracker,
  _retryEngine,
  _batchEngine,
  _preferenceEngine
);

/** channelRegistry — register IChannelProvider implementations here */
export const channelRegistry = _channelRegistry;

/** templateManager — access and manage notification templates */
export const templateManager = _templateManager;

/** preferenceEngine — manage recipient profiles and DND settings */
export const preferenceEngine = _preferenceEngine;

/** notificationRouter — primary entry point for all notification dispatch */
export const notificationRouter = _notificationRouter;

/** deliveryTracker — query delivery statuses */
export const deliveryTracker = _deliveryTracker;

/** retryEngine — manage retry scheduling and processing */
export const retryEngine = _retryEngine;

/** batchEngine — manage batched notifications */
export const batchEngine = _batchEngine;

/** digestEngine — manage notification digests */
export const digestEngine = _digestEngine;

/** notificationHistory — query notification history */
export const notificationHistory = _historyService;

/** notificationAnalytics — delivery analytics and reporting */
export const notificationAnalytics = _analyticsService;
