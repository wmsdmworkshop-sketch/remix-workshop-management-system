// ==========================================
// Customer Portal — SWR Cache Layer
// ==========================================
// Stale-While-Revalidate cache strategy to prevent DB locks
// when multiple customers refresh simultaneously.
// Uses Redis if available, falls back to in-memory Map.

import Redis from "ioredis";

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  staleAfterMs: number;
  expireAfterMs: number;
}

const STALE_MS = 30_000;   // 30 seconds — return cached, revalidate in background
const EXPIRE_MS = 300_000; // 5 minutes — force synchronous refetch

let redis: Redis | null = null;
const memoryCache = new Map<string, CacheEntry>();

export function initCacheRedis(redisInstance: Redis | null) {
  redis = redisInstance;
}

/**
 * Get a cached value. Returns { data, isStale } or null if not cached/expired.
 */
export async function cacheGet<T>(key: string): Promise<{ data: T; isStale: boolean } | null> {
  const now = Date.now();

  if (redis) {
    try {
      const raw = await redis.get(`cache:customer:${key}`);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const age = now - entry.timestamp;

      if (age > entry.expireAfterMs) {
        await redis.del(`cache:customer:${key}`);
        return null;
      }

      return {
        data: entry.data,
        isStale: age > entry.staleAfterMs,
      };
    } catch (err) {
      console.error("[Cache] Redis get error:", err);
    }
  }

  // In-memory fallback
  const entry = memoryCache.get(key);
  if (!entry) return null;

  const age = now - entry.timestamp;
  if (age > entry.expireAfterMs) {
    memoryCache.delete(key);
    return null;
  }

  return {
    data: entry.data as T,
    isStale: age > entry.staleAfterMs,
  };
}

/**
 * Set a cached value with SWR timing.
 */
export async function cacheSet<T>(key: string, data: T, staleMs = STALE_MS, expireMs = EXPIRE_MS): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    staleAfterMs: staleMs,
    expireAfterMs: expireMs,
  };

  if (redis) {
    try {
      const ttlSeconds = Math.ceil(expireMs / 1000);
      await redis.set(`cache:customer:${key}`, JSON.stringify(entry), "EX", ttlSeconds);
      return;
    } catch (err) {
      console.error("[Cache] Redis set error:", err);
    }
  }

  // In-memory fallback
  memoryCache.set(key, entry);
}

/**
 * Delete a specific cache key.
 */
export async function cacheDel(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(`cache:customer:${key}`);
    } catch (err) {
      // ignore
    }
  }
  memoryCache.delete(key);
}

/**
 * SWR-aware data fetcher.
 * Returns cached data immediately if fresh.
 * Returns stale data and triggers background revalidation if stale.
 * Fetches synchronously only if expired or not cached.
 */
export async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs = STALE_MS,
  expireMs = EXPIRE_MS
): Promise<T> {
  const cached = await cacheGet<T>(key);

  if (cached && !cached.isStale) {
    // Fresh cache hit — return immediately
    return cached.data;
  }

  if (cached && cached.isStale) {
    // Stale cache hit — return cached data, revalidate in background
    // Fire-and-forget revalidation
    fetcher().then((freshData) => {
      cacheSet(key, freshData, staleMs, expireMs);
    }).catch((err) => {
      console.error("[Cache] Background revalidation failed:", err);
    });

    return cached.data;
  }

  // Cache miss — synchronous fetch
  const freshData = await fetcher();
  await cacheSet(key, freshData, staleMs, expireMs);
  return freshData;
}

// ---- AI Query Vector Cache ----
// Simple hash-based cache for common customer queries to avoid LLM calls.

const queryCache = new Map<string, { response: string; expiresAt: number }>();
const QUERY_CACHE_TTL = 120_000; // 2 minutes

/**
 * Normalize and hash a user query for cache lookup.
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a query has a cached AI response.
 */
export function getQueryCache(mobile: string, query: string): string | null {
  const key = `${mobile}:${normalizeQuery(query)}`;
  const entry = queryCache.get(key);

  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return null;
  }

  return entry.response;
}

/**
 * Cache an AI response for a query.
 */
export function setQueryCache(mobile: string, query: string, response: string): void {
  const key = `${mobile}:${normalizeQuery(query)}`;
  queryCache.set(key, {
    response,
    expiresAt: Date.now() + QUERY_CACHE_TTL,
  });
}
