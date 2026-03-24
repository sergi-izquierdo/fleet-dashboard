"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DashboardData } from "@/types/dashboard";

export type ConnectionStatus = "connected" | "disconnected" | "error";

const REFRESH_INTERVAL = 30;

export interface UseDashboardDataReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  countdown: number;
  refresh: () => void;
}

export function useDashboardData(repo?: string): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardData | null>(null);
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
      const url = repo
        ? `/api/dashboard?repo=${encodeURIComponent(repo)}`
        : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: DashboardData = await res.json();
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
  }, [repo]);

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
