/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Barrel Export
 * Module: event-catalog/index.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 5 (Folder Structure)
 *
 * Single import point for the entire Event Catalog module.
 * Exports pre-wired singleton instances for monolith use.
 * =============================================================================
 */

// Types
export * from "./types.ts";

// Services
export { SchemaRegistry } from "./schema-registry.ts";
export type { ISchemaRegistry } from "./schema-registry.ts";

export { EventVersioningService } from "./event-versioning.ts";
export type { IEventVersioning, VersionCompatibilityResult, DeprecationResult } from "./event-versioning.ts";

export { EventValidator } from "./event-validator.ts";
export type { IEventValidator } from "./event-validator.ts";

export { ConsumerRegistry } from "./consumer-registry.ts";
export type { IConsumerRegistry } from "./consumer-registry.ts";

export { LineageTracker } from "./lineage-tracker.ts";
export type { ILineageTracker } from "./lineage-tracker.ts";

export { EventDiscoveryService } from "./event-discovery.ts";
export type { IEventDiscovery, ICatalogReader, EventCatalogSummary } from "./event-discovery.ts";

export { EventDocumentationService } from "./event-documentation.ts";
export type { IEventDocumentation } from "./event-documentation.ts";

export {
  CatalogRegistry,
  PLATFORM_EVENT_DEFINITIONS,
  bootstrapEventCatalog,
} from "./catalog-registry.ts";
export type { ICatalogRegistry } from "./catalog-registry.ts";

// ---------------------------------------------------------------------------
// Pre-wired Singletons (monolith convenience)
// ---------------------------------------------------------------------------

import { SchemaRegistry } from "./schema-registry.ts";
import { ConsumerRegistry } from "./consumer-registry.ts";
import { LineageTracker } from "./lineage-tracker.ts";
import { CatalogRegistry, bootstrapEventCatalog } from "./catalog-registry.ts";
import { EventValidator } from "./event-validator.ts";
import { EventVersioningService } from "./event-versioning.ts";
import { EventDiscoveryService } from "./event-discovery.ts";
import { EventDocumentationService } from "./event-documentation.ts";

const _schemaRegistry = new SchemaRegistry();
const _consumerRegistry = new ConsumerRegistry();
const _lineageTracker = new LineageTracker();

const _catalogRegistry = new CatalogRegistry(_schemaRegistry);
bootstrapEventCatalog(_catalogRegistry);

const _eventValidator = new EventValidator(_schemaRegistry);
const _eventVersioning = new EventVersioningService(_schemaRegistry);
const _eventDiscovery = new EventDiscoveryService(_catalogRegistry, _consumerRegistry);
const _eventDocumentation = new EventDocumentationService(
  _catalogRegistry,
  _consumerRegistry,
  _lineageTracker
);

/** schemaRegistry — versioned payload schema store */
export const schemaRegistry = _schemaRegistry;

/** catalogRegistry — master event catalog */
export const catalogRegistry = _catalogRegistry;

/** consumerRegistry — tracks which modules consume which events */
export const consumerRegistry = _consumerRegistry;

/** lineageTracker — event cause-and-effect graph */
export const lineageTracker = _lineageTracker;

/** eventValidator — validates payloads against registered schemas */
export const eventValidator = _eventValidator;

/** eventVersioning — semver checks and deprecation lifecycle */
export const eventVersioning = _eventVersioning;

/** eventDiscovery — searchable catalog API */
export const eventDiscovery = _eventDiscovery;

/** eventDocumentation — markdown and structured doc generation */
export const eventDocumentation = _eventDocumentation;
