"use client";

import { useState, useEffect, useCallback } from "react";
import type { TmuxSession, SessionsResponse } from "@/types/sessions";
import { getOrFetch } from "@/lib/apiCache";

/** Real-time data — refresh every 10 seconds per fleet standards. */
const REFRESH_INTERVAL_MS = 10_000;
const DEDUP_TTL_MS = 1_000;

export interface UseAgentStateReturn {
  sessions: TmuxSession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAgentState(): UseAgentStateReturn {
  const [sessions, setSessions] = useState<TmuxSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getOrFetch<SessionsResponse>(
        "/api/sessions",
        DEDUP_TTL_MS,
        async () => {
          const res = await fetch("/api/sessions");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<SessionsResponse>;
        },
      );
      if (data.error) {
        setError(data.error);
        setSessions(data.sessions ?? []);
      } else {
        setError(null);
        setSessions(data.sessions ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { sessions, isLoading, error, refresh };
}
