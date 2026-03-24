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
}
