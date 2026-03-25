"use client";

import { useState, useEffect } from "react";

interface DispatcherProject {
  repo: string;
  url: string;
}

interface DispatcherConfig {
  maxConcurrentAgents: number;
  maxPerProject: number;
  pollIntervalMs: number;
  agentTimeoutMs: number;
  cleanupWindowMs: number;
  stateRetentionMs: number;
  plannerEnabled: boolean;
  reviewBeforeMerge: boolean;
  projects: DispatcherProject[];
}

function msToHuman(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return `${days}d`;
}

interface ConfigRowProps {
  label: string;
  value: string | number | boolean;
}

function ConfigRow({ label, value }: ConfigRowProps) {
  const isBoolean = typeof value === "boolean";
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
      <span className="text-sm text-gray-500 dark:text-white/50">{label}</span>
      {isBoolean ? (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
            value
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
          }`}
        >
          {value ? "Enabled" : "Disabled"}
        </span>
      ) : (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {String(value)}
        </span>
      )}
    </div>
  );
}

export default function ConfigViewer() {
  const [config, setConfig] = useState<DispatcherConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => {
        if (!res.ok) throw new Error("Config not available");
        return res.json() as Promise<DispatcherConfig>;
      })
      .then((data) => {
        setConfig(data);
      })
      .catch(() => {
        setError("Failed to load config");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2" data-testid="config-loading">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 rounded bg-gray-200 dark:bg-white/10" />
        ))}
      </div>
    );
  }

  if (error || !config) {
    return (
      <p className="text-sm text-gray-500 dark:text-white/50 text-center py-4" data-testid="config-error">
        {error ?? "No configuration found"}
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="config-viewer">
      {/* Runtime settings */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
          Runtime
        </h3>
        <div className="rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-3">
          <ConfigRow label="Max Concurrent Agents" value={config.maxConcurrentAgents} />
          <ConfigRow label="Max Per Project" value={config.maxPerProject} />
          <ConfigRow label="Poll Interval" value={msToHuman(config.pollIntervalMs)} />
          <ConfigRow label="Agent Timeout" value={msToHuman(config.agentTimeoutMs)} />
          <ConfigRow label="Cleanup Window" value={msToHuman(config.cleanupWindowMs)} />
          <ConfigRow label="State Retention" value={msToHuman(config.stateRetentionMs)} />
        </div>
      </div>

      {/* Feature flags */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
          Features
        </h3>
        <div className="rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-3">
          <ConfigRow label="Planner" value={config.plannerEnabled} />
          <ConfigRow label="Review Before Merge" value={config.reviewBeforeMerge} />
        </div>
      </div>

      {/* Managed projects */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
          Managed Projects ({config.projects.length})
        </h3>
        <div className="rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 divide-y divide-gray-100 dark:divide-white/5">
          {config.projects.map((project) => (
            <div key={project.repo} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-700 dark:text-white/70 font-mono">
                {project.repo}
              </span>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                aria-label={`Open ${project.repo} on GitHub`}
              >
                GitHub ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
