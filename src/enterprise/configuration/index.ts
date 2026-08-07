/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Barrel Export
 * Module: configuration/index.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 5 (Folder Structure)
 *
 * Single import point for all configuration layer consumers.
 * Also exports a pre-wired singleton ConfigProvider for use in the monolith.
 * In microservice extraction, replace the singleton with DI container binding.
 * =============================================================================
 */

// Types & Contracts
export * from "./types.ts";

// Internal Services (exposed for DI / testing)
export { ConfigValidator, configValidator } from "./config-validator.ts";
export type { IConfigValidator } from "./config-validator.ts";

export { ConfigVersioningService } from "./config-versioning.ts";
export type { IConfigVersioning } from "./config-versioning.ts";

export { ConfigCache } from "./config-cache.ts";
export type { IConfigCache } from "./config-cache.ts";

export { ConfigurationAuditService } from "./configuration-audit.ts";
export type {
  IConfigurationAudit,
  ConfigAuditQueryOptions,
} from "./configuration-audit.ts";

export { ConfigRegistry } from "./config-registry.ts";
export type { IConfigRegistry } from "./config-registry.ts";

export { ScopeResolver } from "./scope-resolver.ts";
export type { IScopeResolver } from "./scope-resolver.ts";

export { FeatureFlagEngine } from "./feature-flags.ts";
export type { IFeatureFlagEngine } from "./feature-flags.ts";

export { RuntimeOverridesService } from "./runtime-overrides.ts";
export type { IRuntimeOverridesService } from "./runtime-overrides.ts";

export {
  ConfigLoader,
  PLATFORM_CONFIG_DEFINITIONS,
} from "./config-loader.ts";
export type { IConfigLoader } from "./config-loader.ts";

export { ConfigProvider } from "./config-provider.ts";

// ---------------------------------------------------------------------------
// Pre-wired Singleton (monolith convenience)
// ---------------------------------------------------------------------------

import { ConfigValidator } from "./config-validator.ts";
import { ConfigRegistry } from "./config-registry.ts";
import { ConfigVersioningService } from "./config-versioning.ts";
import { ConfigCache } from "./config-cache.ts";
import { ConfigurationAuditService } from "./configuration-audit.ts";
import { ScopeResolver } from "./scope-resolver.ts";
import { FeatureFlagEngine } from "./feature-flags.ts";
import { RuntimeOverridesService } from "./runtime-overrides.ts";
import { ConfigLoader } from "./config-loader.ts";
import { ConfigProvider } from "./config-provider.ts";

const _validator = new ConfigValidator();
const _registry = new ConfigRegistry(_validator);
const _versioning = new ConfigVersioningService();
const _cache = new ConfigCache(60_000); // 60-second TTL
const _audit = new ConfigurationAuditService();
const _scopeResolver = new ScopeResolver();
const _featureFlags = new FeatureFlagEngine();
const _overrides = new RuntimeOverridesService();
const _loader = new ConfigLoader();

// Bootstrap: load all platform definitions + GLOBAL defaults
_loader.load(_registry, "SYSTEM");

/**
 * configProvider — singleton pre-wired ConfigProvider for the monolith.
 * All platform modules should import this and NOT instantiate ConfigProvider directly.
 */
export const configProvider = new ConfigProvider(
  _registry,
  _scopeResolver,
  _overrides,
  _cache,
  _featureFlags
);

/**
 * configRegistry — exposed for admin write operations (set entries, register overrides).
 */
export const configRegistry = _registry;

/**
 * configOverrides — exposed for operator runtime override management.
 */
export const configOverrides = _overrides;

/**
 * configAudit — exposed for audit log queries.
 */
export const configAudit = _audit;

/**
 * configVersioning — exposed for version history queries.
 */
export const configVersioning = _versioning;

/**
 * featureFlagEngine — exposed for flag state management.
 */
export const featureFlagEngine = _featureFlags;

/**
 * scopeResolver — exported for use in building scope chains.
 * Use ScopeResolver.buildScopeChain(...) to construct context scopes.
 */
export { ScopeResolver as ScopeResolverClass } from "./scope-resolver.ts";
