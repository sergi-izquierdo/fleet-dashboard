"use client";

import { useState, useEffect, useCallback } from "react";
import type { RecentPR } from "@/types/prs";

const REFRESH_INTERVAL_MS = 30_000;

export interface UsePRsDataReturn {
  prs: RecentPR[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePRsData(): UsePRsDataReturn {
  const [prs, setPrs] = useState<RecentPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/prs");
      if (!response.ok) {
        throw new Error(`Failed to fetch PRs: ${response.status}`);
      }
      const data = await response.json();
      setPrs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PRs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { prs, isLoading, error, refresh };
}
