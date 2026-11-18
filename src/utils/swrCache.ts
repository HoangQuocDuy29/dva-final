export interface SwrCacheResult<T> {
  data: T;
  isStale: boolean;
}

export interface SwrCache<T> {
  get: (key?: string) => SwrCacheResult<T> | null;
  set: (key: string, data: T) => void;
  invalidate: (keyPrefix?: string) => void;
  fetch: (opts: {
    key?: string;
    fetcher: () => Promise<T>;
    forceRefresh?: boolean;
  }) => Promise<T>;
}

const registeredCaches = new Set<{ invalidate: () => void }>();

export function invalidateAllSwrCaches(): void {
  registeredCaches.forEach((c) => c.invalidate());
}

/**
 * Lightweight Stale-While-Revalidate (SWR) cache backed by Memory Map + sessionStorage.
 * Keeps public page transitions instant while silently revalidating stale entries in the background.
 */
export function createSwrCache<T>(opts: {
  storagePrefix: string;
  freshMs: number;
  staleMs: number;
  validate?: (value: unknown) => value is T;
}): SwrCache<T> {
  const mem = new Map<string, { data: T; cachedAt: number }>();
  const inflight = new Map<string, Promise<T>>();
  const isValid = opts.validate ?? ((v: unknown): v is T => v !== undefined && v !== null);

  const storageKey = (key: string) => `${opts.storagePrefix}${key}`;

  const get = (key = 'default'): SwrCacheResult<T> | null => {
    const now = Date.now();
    let entry = mem.get(key);

    if (!entry && typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(storageKey(key));
        if (raw) {
          const parsed = JSON.parse(raw) as { data: unknown; cachedAt: unknown };
          if (parsed && typeof parsed.cachedAt === 'number' && isValid(parsed.data)) {
            entry = { data: parsed.data, cachedAt: parsed.cachedAt };
            mem.set(key, entry);
          }
        }
      } catch {
        // Ignore storage / parse failures
      }
    }

    if (!entry) return null;

    const age = now - entry.cachedAt;
    if (age > opts.staleMs) {
      mem.delete(key);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(storageKey(key));
        } catch {
          // Ignore storage errors
        }
      }
      return null;
    }

    return {
      data: entry.data,
      isStale: age > opts.freshMs,
    };
  };

  const set = (key: string, data: T): void => {
    const entry = { data, cachedAt: Date.now() };
    mem.set(key, entry);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
      } catch {
        // Ignore storage quota or private-mode failures
      }
    }
  };

  const invalidate = (keyPrefix?: string): void => {
    if (!keyPrefix) {
      mem.clear();
      inflight.clear();
      if (typeof window !== 'undefined') {
        try {
          const toDelete: string[] = [];
          for (let i = 0; i < window.sessionStorage.length; i += 1) {
            const k = window.sessionStorage.key(i);
            if (k && k.startsWith(opts.storagePrefix)) {
              toDelete.push(k);
            }
          }
          toDelete.forEach((k) => window.sessionStorage.removeItem(k));
        } catch {
          // Ignore storage errors
        }
      }
      return;
    }

    for (const k of mem.keys()) {
      if (k === keyPrefix || k.startsWith(keyPrefix)) {
        mem.delete(k);
      }
    }
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(storageKey(keyPrefix));
      } catch {
        // Ignore storage errors
      }
    }
  };

  const fetch = async (params: {
    key?: string;
    fetcher: () => Promise<T>;
    forceRefresh?: boolean;
  }): Promise<T> => {
    const key = params.key || 'default';
    if (!params.forceRefresh) {
      const cached = get(key);
      if (cached && !cached.isStale) {
        return cached.data;
      }
    }

    const existing = inflight.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const fresh = await params.fetcher();
        set(key, fresh);
        return fresh;
      } catch (err) {
        const staleFallback = get(key);
        if (staleFallback) {
          return staleFallback.data;
        }
        throw err;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, promise);
    return promise;
  };

  const api: SwrCache<T> = { get, set, invalidate, fetch };
  registeredCaches.add(api);
  return api;
}
