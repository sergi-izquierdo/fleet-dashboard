"use client";

import { useState, useEffect, useCallback } from "react";
import type { SystemHealthResponse, SystemMetric } from "@/app/api/system-health/route";

function getBarColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

function MetricBar({ metric }: { metric: SystemMetric }) {
  const color = getBarColor(metric.percent);
  return (
    <div data-testid={`metric-${metric.label.toLowerCase()}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {metric.label}
        </span>
        <span
          className="text-xs font-semibold text-gray-900 dark:text-white"
          data-testid={`metric-${metric.label.toLowerCase()}-percent`}
        >
          {metric.percent}%
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={metric.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${metric.label} usage`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(metric.percent, 100)}%` }}
          data-testid={`metric-${metric.label.toLowerCase()}-bar`}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {metric.usedLabel}
      </p>
    </div>
  );
}

export default function SystemHealthCard() {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/system-health");
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const json: SystemHealthResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch system health");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="system-health-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-2 w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        data-testid="system-health-error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const metrics = [data.disk, data.memory, data.cpu].filter(
    (m): m is SystemMetric => m != null,
  );

  if (metrics.length === 0) {
    return (
      <p
        data-testid="system-health-unavailable"
        className="text-xs text-gray-500 dark:text-gray-400"
      >
        System metrics unavailable
      </p>
    );
  }

  return (
    <div data-testid="system-health" className="space-y-4">
      {metrics.map((metric) => (
        <MetricBar key={metric.label} metric={metric} />
      ))}
    </div>
  );
}
