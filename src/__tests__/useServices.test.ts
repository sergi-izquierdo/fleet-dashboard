import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useServices } from "@/hooks/useServices";
import type { ServicesResponse } from "@/app/api/services/route";
import * as apiCache from "@/lib/apiCache";

const mockServices: ServicesResponse = {
  timestamp: new Date().toISOString(),
  services: [
    { name: "fleet-orchestrator", status: "active", statusText: "active (running)", uptime: "2d", restartCount: 0 },
    { name: "fleet-dashboard", status: "inactive", statusText: "inactive (dead)", uptime: null, restartCount: 1 },
  ],
};

describe("useServices", () => {
  beforeEach(() => {
    apiCache.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useServices());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("fetches /api/services on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockServices,
    });
    const { result } = renderHook(() => useServices());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith("/api/services");
    expect(result.current.data).toEqual(mockServices);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const { result } = renderHook(() => useServices());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toBeNull();
  });

  it("sets error on non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    const { result } = renderHook(() => useServices());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(/500/);
  });

  it("deduplicates concurrent requests via apiCache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockServices,
    });
    global.fetch = fetchMock;

    // Render two hooks at the same time — only one fetch should occur
    const hook1 = renderHook(() => useServices());
    const hook2 = renderHook(() => useServices());

    await waitFor(() => expect(hook1.result.current.isLoading).toBe(false));
    await waitFor(() => expect(hook2.result.current.isLoading).toBe(false));

    // Both should have data
    expect(hook1.result.current.data).toEqual(mockServices);
    expect(hook2.result.current.data).toEqual(mockServices);

    // Only one network request should have been made
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("auto-refreshes every 30 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockServices,
    });
    global.fetch = fetchMock;

    renderHook(() => useServices());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    apiCache.clear(); // clear cache so next poll hits network
    vi.advanceTimersByTime(30_000);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    vi.useRealTimers();
  });
});
