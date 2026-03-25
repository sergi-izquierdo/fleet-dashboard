"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CompletedEntry {
  key: string;
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
  project: string;
}

interface FleetStateStats {
  totalCompleted: number;
  byStatus: Record<string, number>;
  byProject: Record<string, number>;
}

interface FleetStateData {
  active: Record<string, Record<string, unknown>>;
  completed: CompletedEntry[];
  stats: FleetStateStats;
  dispatcherOnline: boolean;
}

export interface UseFleetStateReturn {
  data: FleetStateData | null;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 30_000;

export function useFleetState(): UseFleetStateReturn {
  const [data, setData] = useState<FleetStateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/fleet-state");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: FleetStateData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch fleet state";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    timerRef.current = setInterval(fetchState, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchState]);

  return { data, isLoading, error };
}
