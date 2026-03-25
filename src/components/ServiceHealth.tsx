"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServicesResponse, ServiceStatus } from "@/app/api/services/route";

const STATUS_STYLES: Record<ServiceStatus["status"], { dot: string; label: string }> = {
  active: { dot: "bg-green-500", label: "active" },
  inactive: { dot: "bg-gray-400", label: "inactive" },
  failed: { dot: "bg-red-500", label: "failed" },
  unknown: { dot: "bg-yellow-500", label: "unknown" },
};

function ServiceDot({ service }: { service: ServiceStatus }) {
  const style = STATUS_STYLES[service.status];
  return (
    <div
      className="group relative flex items-center gap-1 cursor-default"
      data-testid={`service-row-${service.name}`}
    >
      <span
        className={`inline-flex h-2 w-2 flex-shrink-0 rounded-full ${style.dot}`}
        aria-label={`${service.name} is ${style.label}`}
        data-testid={`service-indicator-${service.name}`}
      />
      <span className="text-xs text-gray-700 dark:text-gray-300">{service.name}</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
        {service.name}: {style.label}
      </span>
    </div>
  );
}

export default function ServiceHealth() {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const json: ServicesResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch service health");
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
      <div className="flex items-center gap-3" data-testid="service-health-loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        data-testid="service-health-error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const activeCount = data.services.filter((s) => s.status === "active").length;

  return (
    <div data-testid="service-health" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs text-gray-500 dark:text-white/50">
        {activeCount}/{data.services.length} services active
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="service-health-list">
        {data.services.map((service) => (
          <ServiceDot key={service.name} service={service} />
        ))}
      </div>
    </div>
  );
}
