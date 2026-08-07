/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Types & Contracts
 * Module: event-catalog/types.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * All DTOs and domain contracts for the Enterprise Event Catalog.
 * The Event Catalog is READ-ONLY metadata. It does NOT replace or wrap the
 * frozen Kernel EventBus. It catalogs, versions, validates, and documents events.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Event Catalog Domains (maps to EventBus topic namespaces)
// ---------------------------------------------------------------------------

export const EVENT_CATALOG_DOMAINS = [
  "WORKSHOP_CORE",
  "BUSINESS_PROGRAMS",
  "SYSTEM",
  "CUSTOMER_EXPERIENCE",
  "ANALYTICS",
  "AI_PLATFORM",
  "NOTIFICATION",
] as const;

export type EventCatalogDomain = typeof EVENT_CATALOG_DOMAINS[number];

// ---------------------------------------------------------------------------
// Event Category (from existing EventEngine)
// ---------------------------------------------------------------------------

export type EventCategory =
  | "Operational"
  | "Integration"
  | "System"
  | "AI"
  | "CCTV"
  | "Mobile"
  | "Business"
  | "CRM"
  | "Analytics";

// ---------------------------------------------------------------------------
// JSON Schema Subset (lightweight, no external deps)
// ---------------------------------------------------------------------------

export type JsonSchemaType = "string" | "number" | "boolean" | "object" | "array" | "null";

export interface JsonSchemaProperty {
  readonly type: JsonSchemaType | JsonSchemaType[];
  readonly description?: string;
  readonly enum?: readonly (string | number | boolean)[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly format?: string;
  readonly items?: JsonSchemaProperty; // For array types
}

export interface EventPayloadSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, JsonSchemaProperty>>;
  readonly required: ReadonlyArray<string>;
  readonly additionalProperties: boolean;
}

// ---------------------------------------------------------------------------
// Event Definition (the catalog entry for an event type)
// ---------------------------------------------------------------------------

export interface EventDefinition {
  /** Catalog ID, e.g. "EVT-WOC-001" */
  readonly catalogId: string;
  /** Event type string exactly as published on EventBus, e.g. "VEHICLE_GATE_IN" */
  readonly eventType: string;
  readonly domain: EventCatalogDomain;
  readonly category: EventCategory;
  readonly description: string;
  readonly producer: string;
  /** Payload schema for this version */
  readonly payloadSchema: EventPayloadSchema;
  readonly schemaVersion: string;
  readonly tags: ReadonlyArray<string>;
  readonly isDeprecated: boolean;
  readonly deprecatedAt?: string;
  readonly deprecationMessage?: string;
  /** ISO-8601 date this event was introduced */
  readonly introducedAt: string;
  /** Indicates if this event is used in a critical workflow */
  readonly isCritical: boolean;
}

// ---------------------------------------------------------------------------
// Event Schema Version Record
// ---------------------------------------------------------------------------

export interface EventSchemaVersion {
  readonly versionId: string;
  readonly eventType: string;
  readonly schemaVersion: string;
  readonly payloadSchema: EventPayloadSchema;
  readonly publishedAt: string;
  readonly publishedBy: string;
  readonly changeSummary: string;
  readonly isLatest: boolean;
  readonly isDeprecated: boolean;
}

// ---------------------------------------------------------------------------
// Consumer Registration
// ---------------------------------------------------------------------------

export type ConsumerType = "ANALYTICS" | "AI" | "NOTIFICATION" | "COMMAND_CENTER" | "INTEGRATION" | "AUDIT" | "CUSTOM";

export interface EventConsumer {
  readonly consumerId: string;
  readonly consumerName: string;
  readonly consumerType: ConsumerType;
  readonly subscribedEventTypes: ReadonlyArray<string>;
  readonly description: string;
  readonly registeredAt: string;
  readonly contactOwner: string;
  readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// Event Lineage
// ---------------------------------------------------------------------------

export interface EventLineageNode {
  readonly eventType: string;
  /** Event types that this event causes / produces */
  readonly produces: ReadonlyArray<string>;
  /** Event types that trigger or precede this event */
  readonly consumedBy: ReadonlyArray<string>;
  /** Business workflow stages this event belongs to */
  readonly workflowStages: ReadonlyArray<string>;
}

export interface EventLineageGraph {
  readonly nodes: ReadonlyArray<EventLineageNode>;
  readonly generatedAt: string;
}

// ---------------------------------------------------------------------------
// Discovery / Search
// ---------------------------------------------------------------------------

export interface EventDiscoveryQuery {
  domain?: EventCatalogDomain;
  category?: EventCategory;
  tag?: string;
  producer?: string;
  isCritical?: boolean;
  isDeprecated?: boolean;
  searchText?: string;
}

export interface EventDiscoveryResult {
  readonly eventType: string;
  readonly catalogId: string;
  readonly domain: EventCatalogDomain;
  readonly category: EventCategory;
  readonly description: string;
  readonly schemaVersion: string;
  readonly isCritical: boolean;
  readonly isDeprecated: boolean;
  readonly consumerCount: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface EventValidationResult {
  readonly valid: boolean;
  readonly eventType: string;
  readonly schemaVersion: string;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Documentation
// ---------------------------------------------------------------------------

export interface EventDocumentation {
  readonly eventType: string;
  readonly catalogId: string;
  readonly description: string;
  readonly producer: string;
  readonly consumers: ReadonlyArray<string>;
  readonly payloadFields: ReadonlyArray<{
    readonly field: string;
    readonly type: string;
    readonly required: boolean;
    readonly description: string;
  }>;
  readonly lineage: EventLineageNode;
  readonly schemaVersion: string;
  readonly tags: ReadonlyArray<string>;
  readonly generatedAt: string;
}
