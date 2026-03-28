"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServicesResponse, ServiceStatus } from "@/app/api/services/route";
import type { DispatcherStatus } from "@/types/dispatcherStatus";
import SystemHealthCard from "@/components/SystemHealthCard";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

const STATUS_CONFIG: Record<
  ServiceStatus["status"],
  { dot: string; badge: string; label: string }
> = {
  active: {
    dot: "bg-green-500",
    badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    label: "active",
  },
  inactive: {
    dot: "bg-gray-400",
    badge: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    label: "inactive",
  },
  failed: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    label: "failed",
  },
  unknown: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    label: "unknown",
  },
};

function ServiceCard({ service }: { service: ServiceStatus }) {
  const cfg = STATUS_CONFIG[service.status];
  return (
    <div
      data-testid={`service-card-${service.name}`}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-medium text-gray-900 dark:text-white truncate"
          data-testid={`service-name-${service.name}`}
        >
          {service.name}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}
          data-testid={`service-status-${service.name}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div data-testid={`service-uptime-${service.name}`}>
          <span className="font-medium text-gray-700 dark:text-gray-300">Uptime: </span>
          {service.uptime ?? "—"}
        </div>
        <div data-testid={`service-restarts-${service.name}`}>
          <span className="font-medium text-gray-700 dark:text-gray-300">Restarts: </span>
          {service.restartCount != null ? service.restartCount : "—"}
        </div>
      </div>
    </div>
  );
}

function ServiceCardsSection() {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json: ServicesResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch services");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 30_000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  if (isLoading) {
    return (
      <div
        data-testid="service-cards-loading"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        data-testid="service-cards-error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const activeCount = data.services.filter((s) => s.status === "active").length;

  return (
    <div data-testid="service-cards">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Fleet Services</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {activeCount}/{data.services.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>
    </div>
  );
}

function DispatcherCycleSection() {
  const [data, setData] = useState<DispatcherStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDispatcher = useCallback(async () => {
    try {
      const res = await fetch("/api/dispatcher-status");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json: DispatcherStatus = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dispatcher status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDispatcher();
    const interval = setInterval(fetchDispatcher, 30_000);
    return () => clearInterval(interval);
  }, [fetchDispatcher]);

  if (isLoading) {
    return (
      <div data-testid="dispatcher-loading" className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        data-testid="dispatcher-error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </div>
    );
  }

  if (!data || data.offline) {
    return (
      <p data-testid="dispatcher-offline" className="text-xs text-gray-500 dark:text-gray-400">
        Dispatcher offline
      </p>
    );
  }

  const completedPhases = data.phases
    ? Object.values(data.phases).filter((p) => p.status === "completed").length
    : 0;
  const totalPhases = data.phases ? Object.keys(data.phases).length : 0;
  const lastCycle = data.cycle?.finishedAt
    ? new Date(data.cycle.finishedAt).toLocaleTimeString()
    : "—";
  const cycleDurationMs = data.cycle?.durationMs ?? null;
  const rateLimitLevel = data.rateLimit?.level ?? "unknown";
  const rateLimitRemaining = data.rateLimit?.remaining ?? null;

  const rateLimitColors: Record<string, string> = {
    ok: "text-green-600 dark:text-green-400",
    low: "text-yellow-600 dark:text-yellow-400",
    critical: "text-red-600 dark:text-red-400",
    unknown: "text-gray-500 dark:text-gray-400",
  };
  const rateLimitColor = rateLimitColors[rateLimitLevel] ?? rateLimitColors.unknown;

  return (
    <div data-testid="dispatcher-cycle" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          data-testid="dispatcher-last-cycle"
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">Last Cycle</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{lastCycle}</p>
        </div>
        <div
          data-testid="dispatcher-duration"
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {cycleDurationMs != null ? `${(cycleDurationMs / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
        <div
          data-testid="dispatcher-phases"
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">Phases</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {totalPhases > 0 ? `${completedPhases}/${totalPhases}` : "—"}
          </p>
        </div>
        <div
          data-testid="dispatcher-rate-limit"
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">Rate Limit</p>
          <p className={`mt-1 text-sm font-semibold ${rateLimitColor}`}>
            {rateLimitRemaining != null ? `${rateLimitRemaining} remaining` : rateLimitLevel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPageContent() {
  return (
    <div data-testid="services-page-content" className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">System Health</h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <SectionErrorBoundary sectionName="System Health">
            <SystemHealthCard />
          </SectionErrorBoundary>
        </div>
      </div>

      <SectionErrorBoundary sectionName="Fleet Services">
        <ServiceCardsSection />
      </SectionErrorBoundary>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Dispatcher Cycle
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <SectionErrorBoundary sectionName="Dispatcher Cycle">
            <DispatcherCycleSection />
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
}
