"use client";

import { useState, useEffect } from "react";
import type { SystemInfoResponse } from "@/app/api/system-info/route";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUptime(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  if (diffMs < 0) return "unknown";
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

interface InfoRowProps {
  label: string;
  value: string;
  testId?: string;
}

function InfoRow({ label, value, testId }: InfoRowProps) {
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0"
      data-testid={testId}
    >
      <span className="text-sm text-gray-500 dark:text-white/50">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{value}</span>
    </div>
  );
}

export default function SystemInfoCard() {
  const [info, setInfo] = useState<SystemInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/system-info")
      .then((res) => {
        if (!res.ok) throw new Error("System info not available");
        return res.json() as Promise<SystemInfoResponse>;
      })
      .then(setInfo)
      .catch(() => setError("Failed to load system info"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2" data-testid="system-info-loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 rounded bg-gray-200 dark:bg-white/10" />
        ))}
      </div>
    );
  }

  if (error || !info) {
    return (
      <p
        className="text-sm text-gray-500 dark:text-white/50 text-center py-4"
        data-testid="system-info-error"
      >
        {error ?? "System info not available"}
      </p>
    );
  }

  const uptime =
    info.dispatcherStartedAt ? formatUptime(info.dispatcherStartedAt) : "—";
  const stateSize =
    info.stateFileSizeBytes !== null ? formatBytes(info.stateFileSizeBytes) : "—";
  const archived =
    info.archivedCount !== null ? String(info.archivedCount) : "—";

  return (
    <div
      className="rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-3"
      data-testid="system-info-card"
    >
      <InfoRow label="Node.js Version" value={info.nodeVersion} testId="system-info-node" />
      <InfoRow label="Dispatcher Uptime" value={uptime} testId="system-info-uptime" />
      <InfoRow label="State File Size" value={stateSize} testId="system-info-state-size" />
      <InfoRow label="Archived Entries" value={archived} testId="system-info-archived" />
    </div>
  );
}
