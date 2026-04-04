import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default value on initial render", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads stored value from localStorage after mount", async () => {
    window.localStorage.setItem("test-key", JSON.stringify("stored-value"));
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));

    await waitFor(() => {
      expect(result.current[0]).toBe("stored-value");
    });
  });

  it("persists value to localStorage when setter is called", async () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(JSON.parse(window.localStorage.getItem("test-key")!)).toBe("new-value");
  });

  it("works with object values (JSON serialization)", async () => {
    const defaultVal = { a: 1, b: "hello" };
    const { result } = renderHook(() => useLocalStorage("obj-key", defaultVal));

    act(() => {
      result.current[1]({ a: 99, b: "world" });
    });

    expect(result.current[0]).toEqual({ a: 99, b: "world" });
    expect(JSON.parse(window.localStorage.getItem("obj-key")!)).toEqual({ a: 99, b: "world" });
  });

  it("works with boolean values", async () => {
    const { result } = renderHook(() => useLocalStorage("bool-key", false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);

    // New hook instance reads persisted value
    const { result: result2 } = renderHook(() => useLocalStorage("bool-key", false));
    await waitFor(() => {
      expect(result2.current[0]).toBe(true);
    });
  });

  it("returns default value if localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    const { result } = renderHook(() => useLocalStorage("test-key", "fallback"));

    await waitFor(() => {
      // After mount attempt, should fall back to default
      expect(result.current[0]).toBe("fallback");
    });
  });

  it("silently ignores write errors when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() => useLocalStorage("test-key", "default"));

    expect(() => {
      act(() => {
        result.current[1]("new-value");
      });
    }).not.toThrow();

    // In-memory state still updates even if storage fails
    expect(result.current[0]).toBe("new-value");
  });

  it("returns default value if stored JSON is malformed", async () => {
    window.localStorage.setItem("bad-key", "not-valid-json{{{");
    const { result } = renderHook(() => useLocalStorage("bad-key", "default"));

    await waitFor(() => {
      expect(result.current[0]).toBe("default");
    });
  });

  it("returns default value when no item is stored", async () => {
    const { result } = renderHook(() => useLocalStorage("empty-key", 42));

    await waitFor(() => {
      // After hydration attempt, still uses default since nothing is stored
      expect(result.current[0]).toBe(42);
    });
  });
});
