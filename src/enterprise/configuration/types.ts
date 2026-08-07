/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Types & Contracts
 * Module: configuration/types.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * All DTOs, enums, and domain contracts for the Enterprise Configuration Layer.
 * This file has zero external dependencies — it is the root of the config module.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Scope Hierarchy (precedence: higher index wins)
// ---------------------------------------------------------------------------

export const CONFIG_SCOPE_LEVELS = [
  "GLOBAL",
  "DEALER_GROUP",
  "DEALER",
  "BRANCH",
  "WORKSHOP",
  "DEPARTMENT",
  "ROLE",
  "USER",
] as const;

export type ConfigScopeLevel = typeof CONFIG_SCOPE_LEVELS[number];

export interface ConfigScope {
  readonly level: ConfigScopeLevel;
  /** Structured identifier, e.g. "DG:DG-001", "DEALER:DLR-007", "USER:USR-123" */
  readonly identifier: string;
}

// ---------------------------------------------------------------------------
// Configuration Domains
// ---------------------------------------------------------------------------

export const CONFIG_DOMAINS = [
  "SLA",
  "APPROVAL",
  "NOTIFICATION",
  "BUSINESS_RULES",
  "FEATURE_FLAGS",
  "DASHBOARD",
  "AI",
  "ANALYTICS",
  "INTEGRATION",
  "SECURITY",
] as const;

export type ConfigDomain = typeof CONFIG_DOMAINS[number];

// ---------------------------------------------------------------------------
// Value Types
// ---------------------------------------------------------------------------

export type ConfigPrimitiveValue = string | number | boolean | null;
export type ConfigValue = ConfigPrimitiveValue | ConfigPrimitiveValue[] | Record<string, ConfigPrimitiveValue>;

// ---------------------------------------------------------------------------
// Config Definition (the schema/contract registered at bootstrap)
// ---------------------------------------------------------------------------

export interface ConfigDefinition {
  /** Unique key, e.g. "sla.diagnostic.warning_minutes" */
  readonly key: string;
  readonly domain: ConfigDomain;
  readonly description: string;
  readonly valueType: "string" | "number" | "boolean" | "json" | "string[]";
  readonly defaultValue: ConfigValue;
  /** Which scope levels are allowed to override this key */
  readonly allowedScopes: ReadonlyArray<ConfigScopeLevel>;
  readonly isSecret: boolean;
  readonly tags: ReadonlyArray<string>;
  /** Semantic version of this definition, e.g. "1.0.0" */
  readonly definitionVersion: string;
}

// ---------------------------------------------------------------------------
// Config Entry (a resolved key=value at a specific scope)
// ---------------------------------------------------------------------------

export interface ConfigEntry {
  readonly entryId: string;
  readonly key: string;
  readonly value: ConfigValue;
  readonly scope: ConfigScope;
  readonly domain: ConfigDomain;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly version: number;
  readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// Feature Flag
// ---------------------------------------------------------------------------

export type FeatureFlagCategory = "RELEASE" | "EXPERIMENT" | "OPS" | "PERMISSION";

export interface FeatureFlag {
  readonly flagKey: string;
  readonly category: FeatureFlagCategory;
  readonly description: string;
  readonly defaultEnabled: boolean;
  /** Percentage of traffic to enable for (0–100), used for experiments */
  readonly rolloutPercentage: number;
  readonly allowedScopes: ReadonlyArray<ConfigScopeLevel>;
  readonly tags: ReadonlyArray<string>;
}

export interface FeatureFlagState {
  readonly flagKey: string;
  readonly scope: ConfigScope;
  readonly enabled: boolean;
  readonly rolloutPercentage: number;
  readonly setAt: string;
  readonly setBy: string;
}

// ---------------------------------------------------------------------------
// Runtime Override
// ---------------------------------------------------------------------------

export interface RuntimeOverride {
  readonly overrideId: string;
  readonly key: string;
  readonly scope: ConfigScope;
  readonly value: ConfigValue;
  readonly reason: string;
  readonly setBy: string;
  readonly setAt: string;
  /** ISO-8601 expiry; null = permanent until manually removed */
  readonly expiresAt: string | null;
  readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// Config Version Record
// ---------------------------------------------------------------------------

export interface ConfigVersionRecord {
  readonly versionId: string;
  readonly key: string;
  readonly scope: ConfigScope;
  readonly previousValue: ConfigValue;
  readonly newValue: ConfigValue;
  readonly changedBy: string;
  readonly changedAt: string;
  readonly changeReason: string;
  readonly version: number;
}

// ---------------------------------------------------------------------------
// Config Audit Record
// ---------------------------------------------------------------------------

export type ConfigAuditAction =
  | "DEFINITION_REGISTERED"
  | "ENTRY_SET"
  | "ENTRY_UPDATED"
  | "ENTRY_DELETED"
  | "OVERRIDE_SET"
  | "OVERRIDE_EXPIRED"
  | "OVERRIDE_REMOVED"
  | "FLAG_SET"
  | "FLAG_TOGGLED"
  | "CACHE_INVALIDATED";

export interface ConfigAuditRecord {
  readonly auditId: string;
  readonly timestamp: string;
  readonly action: ConfigAuditAction;
  readonly key: string;
  readonly scope: ConfigScope;
  readonly actorId: string;
  readonly actorRole: string;
  readonly previousValue?: ConfigValue;
  readonly newValue?: ConfigValue;
  readonly correlationId: string;
  readonly details: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Resolution Context (passed by consumers to resolve config)
// ---------------------------------------------------------------------------

export interface ConfigResolutionContext {
  /** Ordered from most-specific to least-specific — resolver picks first match */
  readonly scopes: ReadonlyArray<ConfigScope>;
  /** Optional: isolate resolution to a domain */
  readonly domain?: ConfigDomain;
}

// ---------------------------------------------------------------------------
// Resolved Value (full provenance)
// ---------------------------------------------------------------------------

export interface ResolvedConfigValue {
  readonly key: string;
  readonly value: ConfigValue;
  /** The scope at which this value was resolved */
  readonly resolvedAtScope: ConfigScope;
  readonly domain: ConfigDomain;
  readonly fromOverride: boolean;
  readonly resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  readonly value: T;
  readonly cachedAt: number;
  readonly ttlMs: number;
}

// ---------------------------------------------------------------------------
// Provider API (public interface consumed by all platform modules)
// ---------------------------------------------------------------------------

export interface IConfigProvider {
  /**
   * Resolve a config value for the given context.
   * Applies scope hierarchy: most-specific scope wins.
   * Runtime overrides always take precedence.
   */
  resolve(key: string, context: ConfigResolutionContext): Promise<ResolvedConfigValue>;

  /**
   * Resolve multiple keys in a single call.
   */
  resolveMany(keys: string[], context: ConfigResolutionContext): Promise<Map<string, ResolvedConfigValue>>;

  /**
   * Convenience: resolve a boolean feature flag.
   */
  isFeatureEnabled(flagKey: string, context: ConfigResolutionContext): Promise<boolean>;

  /**
   * Convenience: resolve a typed numeric value or return a default.
   */
  getNumber(key: string, context: ConfigResolutionContext, fallback: number): Promise<number>;

  /**
   * Convenience: resolve a typed string value or return a default.
   */
  getString(key: string, context: ConfigResolutionContext, fallback: string): Promise<string>;
}
