import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCachedOrFetch,
  clearCache,
  invalidateCache,
  getCacheMap,
} from "@/lib/apiCache";

describe("apiCache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("calls fetcher on cache miss and returns data with fromCache=false", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

    const result = await getCachedOrFetch("test-key", 60, fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.data).toEqual({ items: [1, 2, 3] });
    expect(result.fromCache).toBe(false);
  });

  it("returns cached data on subsequent calls within TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: "first" });

    await getCachedOrFetch("test-key", 60, fetcher);
    const result = await getCachedOrFetch("test-key", 60, fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.data).toEqual({ value: "first" });
    expect(result.fromCache).toBe(true);
  });

  it("refetches after TTL expires", async () => {
    vi.useFakeTimers();

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    await getCachedOrFetch("key", 30, fetcher);

    // Advance past TTL
    vi.advanceTimersByTime(31_000);

    const result = await getCachedOrFetch("key", 30, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.data).toBe("second");
    expect(result.fromCache).toBe(false);

    vi.useRealTimers();
  });

  it("bypasses cache when fresh=true", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    await getCachedOrFetch("key", 60, fetcher);
    const result = await getCachedOrFetch("key", 60, fetcher, true);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.data).toBe("second");
    expect(result.fromCache).toBe(false);
  });

  it("updates cache entry when fresh=true is used", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    await getCachedOrFetch("key", 60, fetcher);
    await getCachedOrFetch("key", 60, fetcher, true);

    // Next call should get "second" from cache
    const result = await getCachedOrFetch("key", 60, fetcher);
    expect(result.data).toBe("second");
    expect(result.fromCache).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidateCache removes a specific entry", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    await getCachedOrFetch("key", 60, fetcher);
    invalidateCache("key");
    const result = await getCachedOrFetch("key", 60, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.data).toBe("second");
    expect(result.fromCache).toBe(false);
  });

  it("clearCache removes all entries", async () => {
    const fetcherA = vi.fn().mockResolvedValue("a");
    const fetcherB = vi.fn().mockResolvedValue("b");

    await getCachedOrFetch("a", 60, fetcherA);
    await getCachedOrFetch("b", 60, fetcherB);

    expect(getCacheMap().size).toBe(2);
    clearCache();
    expect(getCacheMap().size).toBe(0);
  });

  it("keeps separate cache entries for different keys", async () => {
    const fetcherA = vi.fn().mockResolvedValue("data-a");
    const fetcherB = vi.fn().mockResolvedValue("data-b");

    await getCachedOrFetch("a", 60, fetcherA);
    await getCachedOrFetch("b", 60, fetcherB);

    const resultA = await getCachedOrFetch("a", 60, fetcherA);
    const resultB = await getCachedOrFetch("b", 60, fetcherB);

    expect(resultA.data).toBe("data-a");
    expect(resultA.fromCache).toBe(true);
    expect(resultB.data).toBe("data-b");
    expect(resultB.fromCache).toBe(true);
  });
});
