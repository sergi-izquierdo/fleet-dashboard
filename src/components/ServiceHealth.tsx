"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServicesResponse, ServiceStatus } from "@/app/api/services/route";

const STATUS_STYLES: Record<ServiceStatus["status"], { dot: string; label: string }> = {
  active: { dot: "bg-green-500", label: "active" },
  inactive: { dot: "bg-gray-400", label: "inactive" },
  failed: { dot: "bg-red-500", label: "failed" },
  unknown: { dot: "bg-yellow-500", label: "unknown" },
};

function ServiceRow({ service }: { service: ServiceStatus }) {
  const style = STATUS_STYLES[service.status];
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5"
      data-testid={`service-row-${service.name}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{service.name}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{service.statusText}</p>
      </div>
      <span
        className={`ml-3 inline-flex h-3 w-3 flex-shrink-0 rounded-full ${style.dot}`}
        aria-label={`${service.name} is ${style.label}`}
        data-testid={`service-indicator-${service.name}`}
      />
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
      <div className="space-y-2" data-testid="service-health-loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
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
    <div data-testid="service-health">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-white/50">
          {activeCount}/{data.services.length} services active
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <div className="space-y-2" data-testid="service-health-list">
        {data.services.map((service) => (
          <ServiceRow key={service.name} service={service} />
        ))}
      </div>
    </div>
  );
}
