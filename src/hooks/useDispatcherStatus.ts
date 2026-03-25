"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DispatcherStatus } from "@/types/dispatcherStatus";

export type ConnectionStatus = "connected" | "disconnected" | "error";

const REFRESH_INTERVAL = 15;

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
      const res = await fetch("/api/dispatcher-status");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: DispatcherStatus = await res.json();
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
