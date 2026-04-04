"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DispatcherStatus } from "@/types/dispatcherStatus";
import { getOrFetch } from "@/lib/apiCache";

export type ConnectionStatus = "connected" | "disconnected" | "error";

const REFRESH_INTERVAL = 15;
const DEDUP_TTL_MS = 1_000;

export interface UseDispatcherStatusReturn {
  data: DispatcherStatus | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  countdown: number;
  refresh: () => void;
}

export function useDispatcherStatus(): UseDispatcherStatusReturn {
  const [data, setData] = useState<DispatcherStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const json = await getOrFetch<DispatcherStatus>(
        "/api/dispatcher-status",
        DEDUP_TTL_MS,
        async () => {
          const res = await fetch("/api/dispatcher-status");
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json() as Promise<DispatcherStatus>;
        },
      );
      setData(json);
      setError(null);
      setConnectionStatus("connected");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL);

    if (countdownRef.current) clearInterval(countdownRef.current);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    refreshTimerRef.current = setTimeout(() => {
      fetchData().then(() => startCountdown());
    }, REFRESH_INTERVAL * 1000);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData().then(() => startCountdown());
  }, [fetchData, startCountdown]);

  useEffect(() => {
    fetchData().then(() => startCountdown());

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [fetchData, startCountdown]);

  return { data, isLoading, error, connectionStatus, countdown, refresh };
}
