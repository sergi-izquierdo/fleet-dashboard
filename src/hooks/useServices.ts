"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServicesResponse } from "@/app/api/services/route";
import { getOrFetch } from "@/lib/apiCache";

const REFRESH_INTERVAL_MS = 30_000;
const DEDUP_TTL_MS = 1_000;

export interface UseServicesReturn {
  data: ServicesResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useServices(): UseServicesReturn {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const json = await getOrFetch<ServicesResponse>(
        "/api/services",
        DEDUP_TTL_MS,
        async () => {
          const res = await fetch("/api/services");
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          return res.json() as Promise<ServicesResponse>;
        },
      );
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch services");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
