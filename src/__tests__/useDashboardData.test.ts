import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDashboardData } from "@/hooks/useDashboardData";

const mockData = {
  agents: [
    {
      name: "agent-alpha",
      sessionId: "sess-1",
      status: "working" as const,
      issue: { title: "Test issue", number: 1, url: "http://example.com" },
      branch: "feat/test",
      timeElapsed: "5m",
    },
  ],
  prs: [],
  activityLog: [],
};

describe("useDashboardData", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches data on mount and sets connected status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.connectionStatus).toBe("disconnected");

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.error).toBeNull();
  });

  it("sets error status on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.connectionStatus).toBe("error");
    expect(result.current.data).toBeNull();
  });

  it("sets error on non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("HTTP 500: Internal Server Error");
    expect(result.current.connectionStatus).toBe("error");
  });

  it("starts countdown at 30", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.countdown).toBe(30);
  });

  it("supports manual refresh", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
