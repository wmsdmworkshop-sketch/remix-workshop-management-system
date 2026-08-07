/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Config Provider
 * Module: configuration/config-provider.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * The primary public API surface consumed by all platform modules.
 * Composes: Registry + ScopeResolver + RuntimeOverrides + Cache + FeatureFlags.
 *
 * All platform modules depend ONLY on IConfigProvider — never on internals.
 * =============================================================================
 */

import type {
  IConfigProvider,
  ConfigResolutionContext,
  ResolvedConfigValue,
  ConfigValue,
  ConfigScope,
  ConfigDomain,
} from "./types.ts";
import type { IConfigRegistry } from "./config-registry.ts";
import type { IScopeResolver } from "./scope-resolver.ts";
import type { IRuntimeOverridesService } from "./runtime-overrides.ts";
import type { IConfigCache } from "./config-cache.ts";
import type { IFeatureFlagEngine } from "./feature-flags.ts";
import { ConfigCache } from "./config-cache.ts";

export class ConfigProvider implements IConfigProvider {
  constructor(
    private readonly registry: IConfigRegistry,
    private readonly scopeResolver: IScopeResolver,
    private readonly overrides: IRuntimeOverridesService,
    private readonly cache: IConfigCache,
    private readonly featureFlags: IFeatureFlagEngine
  ) {}

  // ---------------------------------------------------------------------------
  // Core Resolution
  // ---------------------------------------------------------------------------

  public async resolve(
    key: string,
    context: ConfigResolutionContext
  ): Promise<ResolvedConfigValue> {
    const cacheKey = ConfigCache.buildCacheKey(
      key,
      context.scopes.map((s) => s.identifier)
    );

    // Cache check
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const definition = this.registry.getDefinition(key);
    if (!definition) {
      throw new Error(
        `[ConfigProvider] Unknown config key "${key}". Register a definition via ConfigLoader.`
      );
    }

    // Find the first active runtime override across all context scopes
    let activeOverride = undefined;
    for (const scope of context.scopes) {
      const override = this.overrides.get(key, scope);
      if (override) {
        activeOverride = {
          entryId: override.overrideId,
          key: override.key,
          value: override.value,
          scope: override.scope,
          domain: definition.domain,
          createdAt: override.setAt,
          updatedAt: override.setAt,
          updatedBy: override.setBy,
          version: 1,
          isActive: override.isActive,
        };
        break;
      }
    }

    // Gather all registry entries into the format the resolver expects
    const entryMap = new Map(
      this.registry
        .listEntries(undefined)
        .filter((e) => e.key === key)
        .map((e) => [`${e.key}::${e.scope.level}::${e.scope.identifier}`, e])
    );

    const resolved = this.scopeResolver.resolve(
      key,
      context,
      entryMap,
      definition,
      activeOverride
    );

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  public async resolveMany(
    keys: string[],
    context: ConfigResolutionContext
  ): Promise<Map<string, ResolvedConfigValue>> {
    const results = new Map<string, ResolvedConfigValue>();
    await Promise.all(
      keys.map(async (key) => {
        const resolved = await this.resolve(key, context);
        results.set(key, resolved);
      })
    );
    return results;
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods
  // ---------------------------------------------------------------------------

  public async isFeatureEnabled(
    flagKey: string,
    context: ConfigResolutionContext,
    subjectId?: string
  ): Promise<boolean> {
    return this.featureFlags.evaluate(flagKey, context, subjectId);
  }

  public async getNumber(
    key: string,
    context: ConfigResolutionContext,
    fallback: number
  ): Promise<number> {
    try {
      const resolved = await this.resolve(key, context);
      const value = resolved.value;
      if (typeof value === "number" && isFinite(value)) return value;
      return fallback;
    } catch {
      return fallback;
    }
  }

  public async getString(
    key: string,
    context: ConfigResolutionContext,
    fallback: string
  ): Promise<string> {
    try {
      const resolved = await this.resolve(key, context);
      const value = resolved.value;
      if (typeof value === "string") return value;
      return fallback;
    } catch {
      return fallback;
    }
  }

  public async getBoolean(
    key: string,
    context: ConfigResolutionContext,
    fallback: boolean
  ): Promise<boolean> {
    try {
      const resolved = await this.resolve(key, context);
      const value = resolved.value;
      if (typeof value === "boolean") return value;
      return fallback;
    } catch {
      return fallback;
    }
  }

  /** Invalidate cache for a specific key after a write operation. */
  public invalidateCache(key: string): void {
    this.cache.invalidate(key);
  }

  /** Invalidate all cache entries for a scope (e.g. after bulk scope update). */
  public invalidateCacheForScope(scope: ConfigScope): void {
    this.cache.invalidateScope(scope);
  }
}
