"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { DashboardData } from "@/types/dashboard";
import type { DispatcherStatus } from "@/types/dispatcherStatus";
import type { RecentPR } from "@/types/prs";
import type { FleetIssueProgress } from "@/types/issues";
import type { TmuxSession } from "@/types/sessions";
import type { ServicesResponse } from "@/app/api/services/route";

interface FleetStateStats {
  totalCompleted: number;
  byStatus: Record<string, number>;
  byProject: Record<string, number>;
}

export interface FleetStateData {
  active: Record<string, Record<string, unknown>>;
  completed: Array<{
    key: string;
    repo: string;
    issue: number;
    title: string;
    pr: string;
    status: string;
    completedAt: string;
    project: string;
  }>;
  stats: FleetStateStats;
  dispatcherOnline: boolean;
}

export interface FleetDataContextValue {
  dashboardData: DashboardData | null;
  dashboardLoading: boolean;
  dashboardError: string | null;

  fleetState: FleetStateData | null;
  fleetStateLoading: boolean;
  fleetStateError: string | null;

  dispatcherStatus: DispatcherStatus | null;
  dispatcherLoading: boolean;
  dispatcherError: string | null;

  servicesData: ServicesResponse | null;
  servicesLoading: boolean;
  servicesError: string | null;

  prs: RecentPR[];
  prsLoading: boolean;
  prsError: string | null;

  sessions: TmuxSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;

  issueProgress: FleetIssueProgress | null;
  issueProgressLoading: boolean;
  issueProgressError: string | null;
}

const FleetDataContext = createContext<FleetDataContextValue | null>(null);

function usePollEndpoint<T>(
  url: string,
  intervalMs: number,
  initialData: T
): { data: T; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as T;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch ${url}`);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, intervalMs]);

  return { data, isLoading, error };
}

export function FleetDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dashboard = usePollEndpoint<DashboardData | null>(
    "/api/dashboard",
    60_000,
    null
  );
  const fleetState = usePollEndpoint<FleetStateData | null>(
    "/api/fleet-state",
    30_000,
    null
  );
  const dispatcher = usePollEndpoint<DispatcherStatus | null>(
    "/api/dispatcher-status",
    20_000,
    null
  );
  const services = usePollEndpoint<ServicesResponse | null>(
    "/api/services",
    30_000,
    null
  );
  const prsResult = usePollEndpoint<RecentPR[]>("/api/prs", 30_000, []);
  const sessionsResult = usePollEndpoint<{
    sessions: TmuxSession[];
    error?: string;
  } | null>("/api/sessions", 15_000, null);
  const issuesResult = usePollEndpoint<FleetIssueProgress | null>(
    "/api/issues",
    30_000,
    null
  );

  const value: FleetDataContextValue = {
    dashboardData: dashboard.data,
    dashboardLoading: dashboard.isLoading,
    dashboardError: dashboard.error,

    fleetState: fleetState.data,
    fleetStateLoading: fleetState.isLoading,
    fleetStateError: fleetState.error,

    dispatcherStatus: dispatcher.data,
    dispatcherLoading: dispatcher.isLoading,
    dispatcherError: dispatcher.error,

    servicesData: services.data,
    servicesLoading: services.isLoading,
    servicesError: services.error,

    prs: Array.isArray(prsResult.data) ? prsResult.data : [],
    prsLoading: prsResult.isLoading,
    prsError: prsResult.error,

    sessions: sessionsResult.data?.sessions ?? [],
    sessionsLoading: sessionsResult.isLoading,
    sessionsError: sessionsResult.data?.error ?? sessionsResult.error,

    issueProgress: issuesResult.data,
    issueProgressLoading: issuesResult.isLoading,
    issueProgressError: issuesResult.error,
  };

  return (
    <FleetDataContext.Provider value={value}>
      {children}
    </FleetDataContext.Provider>
  );
}

export function useFleetData(): FleetDataContextValue {
  const ctx = useContext(FleetDataContext);
  if (!ctx) {
    throw new Error("useFleetData must be used within a FleetDataProvider");
  }
  return ctx;
}
