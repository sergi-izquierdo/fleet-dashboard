import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePRsData } from "@/hooks/usePRsData";
import type { RecentPR } from "@/types/prs";
import * as apiCache from "@/lib/apiCache";

const mockPRs: RecentPR[] = [
  {
    title: "feat: add CSV export",
    repo: "sergi-izquierdo/fleet-dashboard",
    status: "open",
    ciStatus: "passing",
    createdAt: "2026-03-23T09:00:00Z",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/19",
    number: 19,
    author: "agent-delta",
    hasConflicts: false,
  },
];

describe("usePRsData", () => {
  beforeEach(() => {
    apiCache.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    const { result } = renderHook(() => usePRsData());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.prs).toEqual([]);
  });

  it("fetches /api/prs on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    });
    const { result } = renderHook(() => usePRsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/prs");
    expect(result.current.prs).toEqual(mockPRs);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );
    const { result } = renderHook(() => usePRsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe("Network error");
    expect(result.current.prs).toEqual([]);
  });

  it("refresh re-fetches data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockPRs })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    global.fetch = fetchMock;

    const { result } = renderHook(() => usePRsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prs).toEqual(mockPRs);

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.prs).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("auto-refreshes every 30 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPRs,
    });
    global.fetch = fetchMock;

    renderHook(() => usePRsData());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    vi.useRealTimers();
  });
});
