"use client";

import { Clock } from "lucide-react";
import { useDispatcherStatus } from "@/hooks/useDispatcherStatus";
import type { Agent, PR } from "@/types/dashboard";

export function formatUptime(startedAt: string): string {
  const started = new Date(startedAt).getTime();
  if (isNaN(started)) return "";
  const diffMs = Date.now() - started;
  if (diffMs < 0) return "";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

interface FleetStatusBannerProps {
  agents: Agent[];
  prs: PR[];
}

function RateLimitGauge({ remaining }: { remaining: number }) {
  const color =
    remaining > 1000
      ? "text-green-600 dark:text-green-400"
      : remaining > 200
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";
  return <span className={`font-semibold ${color}`}>{remaining}</span>;
}

export default function FleetStatusBanner({ agents, prs }: FleetStatusBannerProps) {
  const { data, connectionStatus, countdown } = useDispatcherStatus();

  const isOnline = connectionStatus === "connected" && !data?.offline;
  const uptimeText = data?.cycle?.startedAt ? formatUptime(data.cycle.startedAt) : "";
  const activeAgents = agents.filter((a) => a.status === "working").length;
  const openPRs = prs.filter((p) => p.mergeState !== "merged").length;
  const ciFailingCount = prs.filter((p) => p.ciStatus === "failing").length;
  const rateLimitRemaining = data?.rateLimit?.remaining ?? 0;

  return (
    <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-white border border-gray-200 rounded-xl dark:bg-gray-800/50 dark:border-white/10 min-h-[48px]">
      {/* Dispatcher status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-xs font-medium text-gray-700 dark:text-white/80">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {/* Next cycle countdown */}
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/50">
        <span>Next:</span>
        <span className="font-mono font-medium text-gray-700 dark:text-white/80">
          {countdown}s
        </span>
      </div>

      {/* Rate limit gauge */}
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/50">
        <span>Tokens:</span>
        <RateLimitGauge remaining={rateLimitRemaining} />
      </div>

      {/* Uptime badge */}
      {uptimeText && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50">
          <Clock className="w-3 h-3" />
          <span>{uptimeText}</span>
        </div>
      )}

      {/* Spacer — pushes stats right on wide screens, wraps naturally on narrow */}
      <div className="hidden sm:block sm:flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 dark:text-white/50">Active:</span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">{activeAgents}</span>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 dark:text-white/50">PRs:</span>
        <span className="font-semibold text-yellow-600 dark:text-yellow-400">{openPRs}</span>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 dark:text-white/50">CI Fail:</span>
        <span
          className={`font-semibold ${ciFailingCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-white/80"}`}
        >
          {ciFailingCount}
        </span>
      </div>
    </div>
  );
}
