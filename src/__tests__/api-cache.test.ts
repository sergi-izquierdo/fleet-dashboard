import { describe, it, expect, vi, beforeEach } from "vitest";
import * as apiCache from "@/lib/apiCache";

beforeEach(() => {
  apiCache.clear();
});

describe("apiCache", () => {
  it("returns null for missing key", () => {
    expect(apiCache.get("missing")).toBeNull();
  });

  it("stores and retrieves a value", () => {
    apiCache.set("key", { data: 1 }, 5000);
    expect(apiCache.get("key")).toEqual({ data: 1 });
  });

  it("expires entries after TTL", () => {
    vi.useFakeTimers();
    apiCache.set("key", "value", 1000);
    expect(apiCache.get("key")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(apiCache.get("key")).toBeNull();
    vi.useRealTimers();
  });

  it("invalidates a specific key", () => {
    apiCache.set("a", 1, 5000);
    apiCache.set("b", 2, 5000);
    apiCache.invalidate("a");
    expect(apiCache.get("a")).toBeNull();
    expect(apiCache.get("b")).toBe(2);
  });

  it("clears all entries", () => {
    apiCache.set("a", 1, 5000);
    apiCache.set("b", 2, 5000);
    apiCache.clear();
    expect(apiCache.get("a")).toBeNull();
    expect(apiCache.get("b")).toBeNull();
  });

  it("overwrites existing key with new TTL", () => {
    vi.useFakeTimers();
    apiCache.set("key", "old", 1000);
    apiCache.set("key", "new", 5000);
    vi.advanceTimersByTime(1500);
    expect(apiCache.get("key")).toBe("new");
    vi.useRealTimers();
  });
});
