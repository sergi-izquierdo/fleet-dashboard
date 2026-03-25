interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Return cached value if it exists and hasn't expired, otherwise null. */
export function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Store a value with a time-to-live in milliseconds. */
export function set<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Remove a specific key from the cache. */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Remove all entries (useful for testing). */
export function clear(): void {
  store.clear();
  inflight.clear();
}

/**
 * In-flight promise map for request coalescing.
 * If multiple callers request the same key before the first resolves,
 * they all share the same promise (one fetch, not N).
 */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Get cached value or fetch it, coalescing concurrent requests.
 * If the cache is cold and a fetch is already in-flight for this key,
 * returns the existing promise instead of starting a duplicate.
 */
export function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== null) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      set(key, data, ttlMs);
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
