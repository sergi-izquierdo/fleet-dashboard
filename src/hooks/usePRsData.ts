"use client";

import { useState, useEffect, useCallback } from "react";
import type { RecentPR } from "@/types/prs";
import { getOrFetch, invalidate } from "@/lib/apiCache";

const REFRESH_INTERVAL_MS = 30_000;
const DEDUP_TTL_MS = 1_000;

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
    // Invalidate cache so explicit refresh always fetches fresh data.
    // Periodic auto-refresh still benefits from dedup via getOrFetch.
    invalidate("/api/prs");
    try {
      const data = await getOrFetch<RecentPR[]>(
        "/api/prs",
        DEDUP_TTL_MS,
        async () => {
          const response = await fetch("/api/prs");
          if (!response.ok) {
            throw new Error(`Failed to fetch PRs: ${response.status}`);
          }
          return response.json() as Promise<RecentPR[]>;
        },
      );
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
