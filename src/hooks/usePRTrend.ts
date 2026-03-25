"use client";

import { useState, useEffect, useCallback } from "react";
import type { PRTrendResponse } from "@/app/api/pr-trend/route";

const REFRESH_INTERVAL_MS = 60_000;

export interface UsePRTrendReturn {
  data: PRTrendResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function usePRTrend(): UsePRTrendReturn {
  const [data, setData] = useState<PRTrendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pr-trend");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: PRTrendResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch PR trend");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error };
}
