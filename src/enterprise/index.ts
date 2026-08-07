/**
 * =============================================================================
 * DWIP Enterprise Foundation — Root Barrel Export
 * Module: src/enterprise/index.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 5 (Folder Structure)
 *
 * Single import point for the entire Enterprise Foundation layer.
 * Phase 1 of DWIP-V1-ENT-001 implementation.
 *
 * Usage:
 *   import { configProvider, notificationRouter, catalogRegistry } from '../enterprise';
 * =============================================================================
 */

// ── Configuration Layer ──────────────────────────────────────────────────────
export {
  // Core Types
  CONFIG_SCOPE_LEVELS,
  CONFIG_DOMAINS,

  // Services
  ConfigValidator,
  configValidator,
  ConfigVersioningService,
  ConfigCache,
  ConfigurationAuditService,
  ConfigRegistry,
  ScopeResolver,
  FeatureFlagEngine,
  RuntimeOverridesService,
  ConfigLoader,
  ConfigProvider,
  PLATFORM_CONFIG_DEFINITIONS,

  // Pre-wired Singletons
  configProvider,
  configRegistry,
  configOverrides,
  configAudit,
  configVersioning,
  featureFlagEngine,
  ScopeResolverClass,
} from "./configuration/index.ts";

export type {
  ConfigScopeLevel,
  ConfigScope,
  ConfigDomain,
  ConfigValue,
  ConfigDefinition,
  ConfigEntry,
  FeatureFlag,
  FeatureFlagState,
  FeatureFlagCategory,
  RuntimeOverride,
  ConfigVersionRecord,
  ConfigAuditRecord,
  ConfigAuditAction,
  ConfigValidationResult,
  ConfigResolutionContext,
  ResolvedConfigValue,
  CacheEntry,
  IConfigProvider,
  IConfigValidator,
  IConfigVersioning,
  IConfigCache,
  IConfigurationAudit,
  IConfigRegistry,
  IScopeResolver,
  IFeatureFlagEngine,
  IRuntimeOverridesService,
  IConfigLoader,
} from "./configuration/index.ts";

// ── Event Catalog ────────────────────────────────────────────────────────────
export {
  // Services
  SchemaRegistry,
  EventVersioningService,
  EventValidator,
  ConsumerRegistry,
  LineageTracker,
  EventDiscoveryService,
  EventDocumentationService,
  CatalogRegistry,
  PLATFORM_EVENT_DEFINITIONS,
  bootstrapEventCatalog,

  // Pre-wired Singletons
  schemaRegistry,
  catalogRegistry,
  consumerRegistry,
  lineageTracker,
  eventValidator,
  eventVersioning,
  eventDiscovery,
  eventDocumentation,
} from "./event-catalog/index.ts";

export type {
  EventCatalogDomain,
  EventCategory,
  EventPayloadSchema,
  EventDefinition,
  EventSchemaVersion,
  EventConsumer,
  ConsumerType,
  EventLineageNode,
  EventLineageGraph,
  EventDiscoveryQuery,
  EventDiscoveryResult,
  EventValidationResult,
  EventDocumentation,
  ISchemaRegistry,
  IEventVersioning,
  IEventValidator,
  IConsumerRegistry,
  ILineageTracker,
  IEventDiscovery,
  ICatalogReader,
  IEventDocumentation,
  ICatalogRegistry,
  EventCatalogSummary,
  VersionCompatibilityResult,
  DeprecationResult,
} from "./event-catalog/index.ts";

// ── Notification Hub ─────────────────────────────────────────────────────────
export {
  // Services
  ChannelRegistry,
  TemplateManager,
  PreferenceEngine,
  ChannelSelector,
  DeliveryTracker,
  RetryEngine,
  BatchEngine,
  DigestEngine,
  NotificationHistoryService,
  NotificationAnalyticsService,
  NotificationRouter,
  PLATFORM_TEMPLATES,

  // Pre-wired Singletons
  channelRegistry,
  templateManager,
  preferenceEngine,
  notificationRouter,
  deliveryTracker,
  retryEngine,
  batchEngine,
  digestEngine,
  notificationHistory,
  notificationAnalytics,
} from "./notification-hub/index.ts";

export type {
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationTemplate,
  NotificationRequest,
  RecipientProfile,
  ChannelPreference,
  NotificationRecord,
  NotificationStatus,
  DeliveryEvent,
  RetryPolicy,
  NotificationBatch,
  DigestBundle,
  DigestFrequency,
  NotificationAnalyticsSnapshot,
  IChannelProvider,
  INotificationRouter,
  IChannelRegistry,
  ITemplateManager,
  IPreferenceEngine,
  IChannelSelector,
  IDeliveryTracker,
  IRetryEngine,
  IBatchEngine,
  IDigestEngine,
  INotificationHistory,
  INotificationAnalytics,
} from "./notification-hub/index.ts";
