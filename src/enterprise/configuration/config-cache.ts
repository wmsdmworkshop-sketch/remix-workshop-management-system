/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Config Cache
 * Module: configuration/config-cache.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * TTL-based in-memory cache for resolved configuration values.
 * Prevents repeated scope resolution for hot config keys.
 * Single Responsibility: cache management only.
 * =============================================================================
 */

import type { CacheEntry, ResolvedConfigValue, ConfigScope } from "./types.ts";

export interface IConfigCache {
  get(cacheKey: string): ResolvedConfigValue | undefined;
  set(cacheKey: string, value: ResolvedConfigValue, ttlMs?: number): void;
  invalidate(key: string): void;
  invalidateScope(scope: ConfigScope): void;
  invalidateAll(): void;
  size(): number;
}

export class ConfigCache implements IConfigCache {
  private readonly store = new Map<string, CacheEntry<ResolvedConfigValue>>();

  /** Default TTL: 60 seconds. Override per-entry if needed. */
  private static readonly DEFAULT_TTL_MS = 60_000;

  constructor(private readonly defaultTtlMs: number = ConfigCache.DEFAULT_TTL_MS) {}

  // ---------------------------------------------------------------------------
  // Cache Key Generation
  // ---------------------------------------------------------------------------

  /**
   * Builds a deterministic cache key from a config key and the scope identifiers
   * used during resolution.  The key encodes all scopes tried so that different
   * resolution contexts produce different entries.
   */
  public static buildCacheKey(configKey: string, scopeIdentifiers: string[]): string {
    return `${configKey}::${scopeIdentifiers.join("|")}`;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public get(cacheKey: string): ResolvedConfigValue | undefined {
    const entry = this.store.get(cacheKey);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.cachedAt > entry.ttlMs) {
      this.store.delete(cacheKey);
      return undefined;
    }

    return entry.value;
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public set(cacheKey: string, value: ResolvedConfigValue, ttlMs?: number): void {
    const entry: CacheEntry<ResolvedConfigValue> = {
      value,
      cachedAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    };
    this.store.set(cacheKey, entry);
  }

  // ---------------------------------------------------------------------------
  // Invalidation
  // ---------------------------------------------------------------------------

  /** Invalidate all cache entries for a given config key (across all scopes). */
  public invalidate(key: string): void {
    for (const cacheKey of this.store.keys()) {
      if (cacheKey.startsWith(`${key}::`)) {
        this.store.delete(cacheKey);
      }
    }
  }

  /** Invalidate all cache entries for a given scope identifier. */
  public invalidateScope(scope: ConfigScope): void {
    for (const [cacheKey] of this.store) {
      if (cacheKey.includes(scope.identifier)) {
        this.store.delete(cacheKey);
      }
    }
  }

  /** Flush the entire cache. */
  public invalidateAll(): void {
    this.store.clear();
  }

  /** Returns current number of live (non-expired) entries. */
  public size(): number {
    this.evictExpired();
    return this.store.size;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.cachedAt > entry.ttlMs) {
        this.store.delete(key);
      }
    }
  }
}
