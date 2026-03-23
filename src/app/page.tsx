"use client";

import { AgentCard } from "@/components/AgentCard";
import ActivityLog from "@/components/ActivityLog";
import RecentPRs from "@/components/RecentPRs";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import AgentStatusCards from "@/components/AgentStatusCards";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Home() {
  const { data, isLoading, error, connectionStatus, countdown, refresh } =
    useDashboardData();

  const stats = data
    ? [
        {
          label: "Total Agents",
          value: data.agents.length,
          color: "text-gray-900 dark:text-white",
        },
        {
          label: "Active",
          value: data.agents.filter((a) => a.status === "working").length,
          color: "text-blue-400",
        },
        {
          label: "Errors",
          value: data.agents.filter((a) => a.status === "error").length,
          color: "text-red-400",
        },
        {
          label: "PRs Open",
          value: data.prs.filter((p) => p.mergeState === "open").length,
          color: "text-yellow-400",
        },
        {
          label: "PRs Merged",
          value: data.prs.filter((p) => p.mergeState === "merged").length,
          color: "text-purple-400",
        },
        {
          label: "CI Passing",
          value: data.prs.filter((p) => p.ciStatus === "passing").length,
          color: "text-green-400",
        },
      ]
    : [];

  const activityEvents = data
    ? data.activityLog.map((evt) => ({
        id: evt.id,
        timestamp: evt.timestamp,
        agentName: evt.agentName,
        eventType: evt.eventType as import("@/components/ActivityLog").EventType,
        description: evt.description,
      }))
    : [];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold">F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Fleet Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationCenter />
            <ConnectionIndicator status={connectionStatus} />
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
              <span data-testid="countdown">
                {countdown}s
              </span>
              <button
                onClick={refresh}
                disabled={isLoading}
                className="rounded-md border border-gray-300 dark:border-white/20 px-2.5 py-1 text-xs text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="refresh-button"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div
          className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
          role="alert"
          data-testid="error-banner"
        >
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span className="font-medium">Connection error:</span> {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !data ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          {/* Stats Bar */}
          <section
            aria-label="Dashboard statistics"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5 p-4 text-center"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* Agent Sessions (tmux) */}
          <AgentStatusCards />

          {/* Agent Cards Grid */}
          <section aria-label="Agent cards">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Agents
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.agents.map((agent) => (
                <AgentCard
                  key={agent.sessionId}
                  agentName={agent.name}
                  status={agent.status}
                  issueTitle={agent.issue.title}
                  branchName={agent.branch}
                  timeElapsed={agent.timeElapsed}
                  prUrl={agent.pr?.url}
                />
              ))}
            </div>
          </section>

          {/* Recent PRs */}
          <section aria-label="Recent PRs">
            <RecentPRs />
          </section>

          {/* Activity Log */}
          <section aria-label="Activity log">
            <ActivityLog events={activityEvents} maxHeight="max-h-[32rem]" />
          </section>
        </div>
      ) : null}
    </main>
  );
}
