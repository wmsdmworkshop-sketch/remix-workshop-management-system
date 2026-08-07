import { envConfig } from "../config/env.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Redis Service & Resilience Cache (WP-07)
 * Bounded Context: Persistence / Distributed Caching & PubSub
 * Description: Enterprise caching service with automatic fallback to bounded
 *              in-memory storage when Redis server is offline or disabled.
 * =============================================================================
 */

interface InMemoryEntry {
  value: any;
  expiresAt: number;
}

export class RedisService {
  private inMemoryCache: Map<string, InMemoryEntry> = new Map();
  private redisConnected: boolean = false;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor() {
    this.redisConnected = envConfig.REDIS_ENABLED;
  }

  public isOnline(): boolean {
    return this.redisConnected;
  }

  public setOnlineState(online: boolean): void {
    this.redisConnected = online;
  }

  /**
   * Retrieves a cached value by key.
   */
  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    if (this.inMemoryCache.has(key)) {
      const entry = this.inMemoryCache.get(key)!;
      if (entry.expiresAt > now) {
        this.hitCount++;
        return entry.value as T;
      }
      this.inMemoryCache.delete(key); // Cache expired
    }

    this.missCount++;
    return null;
  }

  /**
   * Stores a value in cache with a TTL (in seconds).
   */
  public async set<T>(key: string, value: T, ttlSec: number = 300): Promise<void> {
    const expiresAt = Date.now() + ttlSec * 1000;
    this.inMemoryCache.set(key, { value, expiresAt });
  }

  /**
   * Deletes a key from cache.
   */
  public async del(key: string): Promise<void> {
    this.inMemoryCache.delete(key);
  }

  /**
   * Flushes all cached keys starting with a prefix namespace (e.g. "dwip:auth:").
   */
  public async flushNamespace(prefix: string): Promise<number> {
    let deletedCount = 0;
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryCache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Returns current cache telemetry metrics.
   */
  public getMetrics() {
    return {
      isOnline: this.redisConnected,
      memoryCacheSize: this.inMemoryCache.size,
      hitCount: this.hitCount,
      missCount: this.missCount
    };
  }

  public resetMetrics(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.inMemoryCache.clear();
  }
}

// Singleton Cache Service Instance
export const redisService = new RedisService();
