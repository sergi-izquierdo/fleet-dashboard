"use client";

import { useState, useEffect, useCallback } from "react";
import type { TokenUsageResponse, TimeRange } from "@/types/tokenUsage";

const REFRESH_INTERVAL_MS = 60_000;

export interface UseTokenUsageReturn {
  data: TokenUsageResponse | null;
  isLoading: boolean;
  error: string | null;
  range: TimeRange;
  setRange: (range: TimeRange) => void;
  /** true when data comes from the observability server (real-time hook events) */
  isLiveData: boolean;
  /** @deprecated Use isLiveData instead. Kept for backward-compat. */
  isLangfuseOnline: boolean;
}

export function useTokenUsage(): UseTokenUsageReturn {
  const [data, setData] = useState<TokenUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("daily");

  const fetchData = useCallback(async (r: TimeRange) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/token-usage?range=${r}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: TokenUsageResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch token usage");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
    const interval = setInterval(() => fetchData(range), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData, range]);

  const isLiveData = data?.source === "observability";
  // Keep isLangfuseOnline for backward compatibility (maps to observability source)
  const isLangfuseOnline = isLiveData;

  return { data, isLoading, error, range, setRange, isLiveData, isLangfuseOnline };
}
