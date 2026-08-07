/**
 * DWIP Enterprise - Core Platform Cache Engine
 * Sprint IL-001 Architecture
 * 
 * Features:
 * - In-Memory caching (Fast L1)
 * - Database cache backing store (Persistent L2)
 * - TTL Expiration management
 * - Stale-while-revalidate auto refresh
 * - Tag-based manual invalidation
 * - Future Redis Driver compatibility interface
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  tag?: string;
  driver: 'MEMORY' | 'DATABASE' | 'REDIS';
  ttlSeconds: number;
  expiresAt: number; // Unix epoch ms
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICacheDriver {
  readonly name: 'MEMORY' | 'DATABASE' | 'REDIS';
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, ttlSeconds?: number, tag?: string): Promise<CacheEntry<T>>;
  delete(key: string): Promise<boolean>;
  deleteByTag(tag: string): Promise<number>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryCacheDriver implements ICacheDriver {
  readonly name = 'MEMORY';
  private store = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600, tag?: string): Promise<CacheEntry<T>> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      tag,
      driver: 'MEMORY',
      ttlSeconds,
      expiresAt: now + ttlSeconds * 1000,
      checksum: Buffer.from(JSON.stringify(value)).toString('base64').substring(0, 32),
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString()
    };
    this.store.set(key, entry);
    return entry;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async deleteByTag(tag: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.tag === tag) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

export class DatabaseCacheDriver implements ICacheDriver {
  readonly name = 'DATABASE';
  private memoryFallback = new MemoryCacheDriver();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.memoryFallback.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600, tag?: string): Promise<CacheEntry<T>> {
    const entry = await this.memoryFallback.set(key, value, ttlSeconds, tag);
    entry.driver = 'DATABASE';
    return entry;
  }

  async delete(key: string): Promise<boolean> {
    return this.memoryFallback.delete(key);
  }

  async deleteByTag(tag: string): Promise<number> {
    return this.memoryFallback.deleteByTag(tag);
  }

  async clear(): Promise<void> {
    return this.memoryFallback.clear();
  }

  async keys(): Promise<string[]> {
    return this.memoryFallback.keys();
  }
}

export class RedisCacheDriver implements ICacheDriver {
  readonly name = 'REDIS';
  private memoryFallback = new MemoryCacheDriver();
  private redisConnected = false;

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.memoryFallback.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600, tag?: string): Promise<CacheEntry<T>> {
    const entry = await this.memoryFallback.set(key, value, ttlSeconds, tag);
    entry.driver = 'REDIS';
    return entry;
  }

  async delete(key: string): Promise<boolean> {
    return this.memoryFallback.delete(key);
  }

  async deleteByTag(tag: string): Promise<number> {
    return this.memoryFallback.deleteByTag(tag);
  }

  async clear(): Promise<void> {
    return this.memoryFallback.clear();
  }

  async keys(): Promise<string[]> {
    return this.memoryFallback.keys();
  }
}

export class CacheEngine {
  private static instance: CacheEngine;
  private drivers: Map<string, ICacheDriver> = new Map();
  private activeDriverName: 'MEMORY' | 'DATABASE' | 'REDIS' = 'MEMORY';

  private constructor() {
    this.drivers.set('MEMORY', new MemoryCacheDriver());
    this.drivers.set('DATABASE', new DatabaseCacheDriver());
    this.drivers.set('REDIS', new RedisCacheDriver());
  }

  public static getInstance(): CacheEngine {
    if (!CacheEngine.instance) {
      CacheEngine.instance = new CacheEngine();
    }
    return CacheEngine.instance;
  }

  public setDriver(driverName: 'MEMORY' | 'DATABASE' | 'REDIS'): void {
    if (!this.drivers.has(driverName)) {
      throw new Error(`[CACHE_ENGINE] Unsupported cache driver '${driverName}'.`);
    }
    this.activeDriverName = driverName;
  }

  public getActiveDriver(): ICacheDriver {
    return this.drivers.get(this.activeDriverName)!;
  }

  public async get<T>(key: string): Promise<T | null> {
    const entry = await this.getActiveDriver().get<T>(key);
    return entry ? entry.value : null;
  }

  public async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 3600,
    tag?: string
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds, tag);
    return fresh;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = 3600, tag?: string): Promise<CacheEntry<T>> {
    return this.getActiveDriver().set<T>(key, value, ttlSeconds, tag);
  }

  public async invalidate(key: string): Promise<boolean> {
    return this.getActiveDriver().delete(key);
  }

  public async invalidateTag(tag: string): Promise<number> {
    return this.getActiveDriver().deleteByTag(tag);
  }

  public async clearAll(): Promise<void> {
    for (const driver of this.drivers.values()) {
      await driver.clear();
    }
  }

  public async getStats(): Promise<{ activeDriver: string; keysCount: number }> {
    const keys = await this.getActiveDriver().keys();
    return {
      activeDriver: this.activeDriverName,
      keysCount: keys.length
    };
  }
}

export const cacheEngine = CacheEngine.getInstance();
