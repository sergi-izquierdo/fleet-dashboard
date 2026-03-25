import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import type { TokenUsageResponse } from "@/types/tokenUsage";

const mockResponse: TokenUsageResponse = {
  timeSeries: [
    {
      date: "2026-03-20",
      inputTokens: 100000,
      outputTokens: 30000,
      totalTokens: 130000,
      cost: 0.75,
    },
  ],
  byProject: [
    {
      name: "agent-1",
      inputTokens: 500000,
      outputTokens: 150000,
      totalTokens: 650000,
      cost: 3.75,
    },
  ],
  totalCost: 3.75,
  totalTokens: 650000,
  source: "observability",
};

describe("useTokenUsage", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches data on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTokenUsage());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
  });

  it("defaults to daily range", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTokenUsage());

    expect(result.current.range).toBe("daily");

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/token-usage?range=daily");
  });

  it("updates range and refetches", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTokenUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setRange("weekly");
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/token-usage?range=weekly"
      );
    });
  });

  it("reports isLiveData true when source is observability", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTokenUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLiveData).toBe(true);
  });

  it("reports isLiveData false when source is estimated", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockResponse, source: "estimated" }),
    });

    const { result } = renderHook(() => useTokenUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLiveData).toBe(false);
  });

  it("reports isLiveData false when source is mock", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockResponse, source: "mock" }),
    });

    const { result } = renderHook(() => useTokenUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLiveData).toBe(false);
  });

  it("sets error on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    });

    const { result } = renderHook(() => useTokenUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });
});
