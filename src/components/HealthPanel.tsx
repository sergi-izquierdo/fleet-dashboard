"use client";

import { useState, useEffect, useCallback } from "react";

interface ServiceStatus {
  status: "up" | "down";
  message: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    tmux: ServiceStatus;
    ao: ServiceStatus;
    observability: ServiceStatus;
    langfuse: ServiceStatus;
  };
  timestamp: string;
}

const SERVICE_LABELS: Record<string, string> = {
  tmux: "tmux Sessions",
  ao: "Agent Orchestrator",
  observability: "Observability",
  langfuse: "Langfuse",
};

const STATUS_STYLES = {
  healthy: {
    label: "Healthy",
    badge: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
    dot: "bg-green-500",
  },
  degraded: {
    label: "Degraded",
    badge: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  unhealthy: {
    label: "Unhealthy",
    badge: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    dot: "bg-red-500",
  },
};

export default function HealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data: HealthResponse = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Service Health
        </h2>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Service Health
        </h2>
        <div
          data-testid="health-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      </div>
    );
  }

  if (!health) return null;

  const overallStyle = STATUS_STYLES[health.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Service Health
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${overallStyle.badge}`}
          data-testid="health-overall-badge"
        >
          <span className={`h-2 w-2 rounded-full ${overallStyle.dot}`} />
          {overallStyle.label}
        </span>
      </div>

      <div className="space-y-2" data-testid="health-services">
        {Object.entries(health.services).map(([key, service]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
            data-testid={`health-service-${key}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {SERVICE_LABELS[key] ?? key}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {service.message}
              </p>
            </div>
            <span
              className={`ml-3 inline-flex h-3 w-3 flex-shrink-0 rounded-full ${
                service.status === "up" ? "bg-green-500" : "bg-red-500"
              }`}
              aria-label={service.status === "up" ? "Service up" : "Service down"}
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
