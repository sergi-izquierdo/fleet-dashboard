import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRelativeTime } from "@/hooks/useRelativeTime";

describe("useRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than 60 seconds ago', () => {
    const { result } = renderHook(() =>
      useRelativeTime(new Date("2026-03-24T11:59:30Z"))
    );
    expect(result.current).toBe("just now");
  });

  it('returns "just now" for future timestamps', () => {
    const { result } = renderHook(() =>
      useRelativeTime(new Date("2026-03-24T12:01:00Z"))
    );
    expect(result.current).toBe("just now");
  });

  it("returns minutes ago for timestamps within the last hour", () => {
    const { result } = renderHook(() =>
      useRelativeTime(new Date("2026-03-24T11:55:00Z"))
    );
    expect(result.current).toBe("5m ago");
  });

  it("returns hours ago for timestamps within the last day", () => {
    const { result } = renderHook(() =>
      useRelativeTime(new Date("2026-03-24T09:00:00Z"))
    );
    expect(result.current).toBe("3h ago");
  });

  it("returns days ago for timestamps older than 24 hours", () => {
    const { result } = renderHook(() =>
      useRelativeTime(new Date("2026-03-22T12:00:00Z"))
    );
    expect(result.current).toBe("2d ago");
  });

  it("accepts an ISO string", () => {
    const { result } = renderHook(() =>
      useRelativeTime("2026-03-24T11:30:00Z")
    );
    expect(result.current).toBe("30m ago");
  });

  it("auto-refreshes every 30 seconds", () => {
    const { result } = renderHook(() =>
      useRelativeTime(new Date("2026-03-24T11:59:30Z"))
    );
    expect(result.current).toBe("just now");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe("1m ago");
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const { unmount } = renderHook(() =>
      useRelativeTime(new Date("2026-03-24T11:00:00Z"))
    );
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
