import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAgentState } from "@/hooks/useAgentState";
import type { SessionsResponse } from "@/types/sessions";
import * as apiCache from "@/lib/apiCache";

const mockSessions: SessionsResponse = {
  sessions: [
    { name: "agent-alpha", status: "working", uptime: "5m", branch: "feat/issue-42", taskName: "Add feature" },
    { name: "agent-beta", status: "idle", uptime: "2m", branch: "feat/issue-55", taskName: "unknown" },
  ],
};

describe("useAgentState", () => {
  beforeEach(() => {
    apiCache.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAgentState());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sessions).toEqual([]);
  });

  it("fetches /api/sessions on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessions,
    });
    const { result } = renderHook(() => useAgentState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith("/api/sessions");
    expect(result.current.sessions).toEqual(mockSessions.sessions);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Connection refused"),
    );
    const { result } = renderHook(() => useAgentState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Connection refused");
    expect(result.current.sessions).toEqual([]);
  });

  it("propagates error field from response and still sets sessions", async () => {
    const errorResponse: SessionsResponse = {
      sessions: mockSessions.sessions,
      error: "tmux unavailable",
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => errorResponse,
    });
    const { result } = renderHook(() => useAgentState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("tmux unavailable");
    expect(result.current.sessions).toEqual(mockSessions.sessions);
  });

  it("deduplicates concurrent requests via apiCache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSessions,
    });
    global.fetch = fetchMock;

    const hook1 = renderHook(() => useAgentState());
    const hook2 = renderHook(() => useAgentState());

    await waitFor(() => expect(hook1.result.current.isLoading).toBe(false));
    await waitFor(() => expect(hook2.result.current.isLoading).toBe(false));

    expect(hook1.result.current.sessions).toEqual(mockSessions.sessions);
    expect(hook2.result.current.sessions).toEqual(mockSessions.sessions);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("auto-refreshes every 10 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSessions,
    });
    global.fetch = fetchMock;

    renderHook(() => useAgentState());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    apiCache.clear(); // clear cache so next poll hits network
    vi.advanceTimersByTime(10_000);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    vi.useRealTimers();
  });
});
