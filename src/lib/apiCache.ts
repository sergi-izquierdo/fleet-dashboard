interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value by key, or compute and store it if missing/expired.
 * @param key - Cache key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Async function to compute the value on cache miss
 * @param fresh - If true, bypass cache and force a fresh fetch
 */
export async function getCachedOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  fresh = false,
): Promise<{ data: T; fromCache: boolean }> {
  if (!fresh) {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() < entry.expiresAt) {
      return { data: entry.data, fromCache: true };
    }
  }

  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  return { data, fromCache: false };
}

/** Clear a specific cache entry */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/** Clear all cache entries */
export function clearCache(): void {
  cache.clear();
}

/** Get the underlying cache map (for testing) */
export function getCacheMap(): Map<string, CacheEntry<unknown>> {
  return cache;
}
