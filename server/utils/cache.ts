import type { Response } from 'express';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_MAX_ENTRIES = 400;

/**
 * Lightweight bounded In-Memory TTL Cache with single-flight coalescing.
 * Reduces repetitive Supabase reads for public first-page routes while allowing
 * instant prefix-based invalidation on writes.
 */
class InMemoryTtlCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh insertion order for lightweight LRU behavior
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      this.evictExpiredOrOldest();
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(scopes: string | string[]): void {
    const prefixes = Array.isArray(scopes) ? scopes : [scopes];
    for (const key of this.store.keys()) {
      if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
        this.store.delete(key);
      }
    }
    // Also clear matching in-flight promises so stale in-flight fetches don't overwrite newer writes
    for (const key of this.inflight.keys()) {
      if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
        this.inflight.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  size(): number {
    return this.store.size;
  }

  private evictExpiredOrOldest(): void {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now >= v.expiresAt) {
        this.store.delete(k);
      }
    }
    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }
}

export const appCache = new InMemoryTtlCache(400);

export const getCache = <T>(key: string): T | undefined => appCache.get<T>(key);
export const setCache = <T>(key: string, value: T, ttlMs: number): void => appCache.set(key, value, ttlMs);
export const getOrSetCache = <T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> =>
  appCache.getOrSet(key, ttlMs, loader);
export const invalidateCache = (scopes: string | string[]): void => appCache.invalidate(scopes);

export function applyPublicCacheHeaders(
  res: Response,
  isStaffUser: boolean,
  opts: { maxAgeSec?: number; swrSec?: number } = {}
): void {
  res.vary('Authorization');
  if (isStaffUser) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return;
  }
  const maxAge = opts.maxAgeSec ?? 60;
  const swr = opts.swrSec ?? 180;
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
}
