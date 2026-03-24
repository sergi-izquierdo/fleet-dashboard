"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import ActivityLog from "@/components/ActivityLog";
import RecentPRs from "@/components/RecentPRs";
import MergeQueue from "@/components/MergeQueue";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import AgentStatusCards from "@/components/AgentStatusCards";
import TokenUsageDashboard from "@/components/TokenUsageDashboard";
import { ToastContainer, showToast } from "@/components/Toast";
import { BottomNav, type MobileTab } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import ProgressTracker from "@/components/ProgressTracker";
import { CommandPalette, buildCommandItems } from "@/components/CommandPalette";
import { Footer } from "@/components/Footer";
import { LogoutButton } from "@/components/LogoutButton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const themes = ["light", "dark", "system"] as const;

export default function Home() {
  const { data, isLoading, error, connectionStatus, countdown, refresh } =
    useDashboardData();
  const [activeTab, setActiveTab] = useState<MobileTab>("agents");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteKey, setPaletteKey] = useState(0);
  const { theme, setTheme } = useTheme();

  const prevAgentsRef = useRef<Map<string, string>>(new Map());

  // Toast notifications for real-time status changes
  useEffect(() => {
    if (!data) return;
    const prevAgents = prevAgentsRef.current;

    if (prevAgents.size > 0) {
      for (const agent of data.agents) {
        const prevStatus = prevAgents.get(agent.sessionId);
        if (prevStatus && prevStatus !== agent.status) {
          const typeMap: Record<string, "success" | "error" | "info" | "warning"> = {
            merged: "success",
            approved: "success",
            error: "error",
            working: "info",
            pr_open: "info",
            review_pending: "warning",
          };
          showToast({
            type: typeMap[agent.status] ?? "info",
            title: `${agent.name}: ${agent.status.replace("_", " ")}`,
            description: agent.issue.title,
          });
        }
      }
    }

    const next = new Map<string, string>();
    for (const agent of data.agents) {
      next.set(agent.sessionId, agent.status);
    }
    prevAgentsRef.current = next;
  }, [data]);

  const cycleTheme = useCallback(() => {
    const currentIndex = themes.indexOf(theme as (typeof themes)[number]);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }, [theme, setTheme]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const openPalette = useCallback(() => {
    setPaletteKey((k) => k + 1);
    setPaletteOpen(true);
  }, []);

  const togglePalette = useCallback(() => {
    setPaletteOpen((prev) => {
      if (!prev) setPaletteKey((k) => k + 1);
      return !prev;
    });
  }, []);

  useKeyboardShortcuts({
    onToggleCommandPalette: togglePalette,
    onRefresh: refresh,
    onToggleTheme: cycleTheme,
  });

  const commandItems = useMemo(
    () =>
      buildCommandItems(data, {
        refresh,
        toggleTheme: cycleTheme,
        scrollToSection,
      }),
    [data, refresh, cycleTheme, scrollToSection],
  );

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
          color: "text-blue-600 dark:text-blue-400",
        },
        {
          label: "Errors",
          value: data.agents.filter((a) => a.status === "error").length,
          color: "text-red-600 dark:text-red-400",
        },
        {
          label: "PRs Open",
          value: data.prs.filter((p) => p.mergeState === "open").length,
          color: "text-yellow-600 dark:text-yellow-400",
        },
        {
          label: "PRs Merged",
          value: data.prs.filter((p) => p.mergeState === "merged").length,
          color: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "CI Passing",
          value: data.prs.filter((p) => p.ciStatus === "passing").length,
          color: "text-green-600 dark:text-green-400",
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
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white pb-[72px] md:pb-0">
      <ToastContainer />

      {/* Command Palette */}
      <CommandPalette
        key={paletteKey}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={commandItems}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <span className="text-sm font-bold">F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Fleet Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={openPalette}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-1.5 text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white/70 transition-colors"
              data-testid="command-palette-trigger"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search...</span>
              <kbd className="rounded border border-gray-300 dark:border-white/20 px-1 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <LogoutButton />
            <NotificationCenter />
            <ConnectionIndicator status={connectionStatus} />
            <div className="hidden items-center gap-2 text-xs text-gray-500 dark:text-white/50 sm:flex">
              <span data-testid="countdown">
                {countdown}s
              </span>
              <button
                onClick={refresh}
                disabled={isLoading}
                className="rounded-md border border-gray-300 dark:border-white/20 px-2.5 py-1 text-xs text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                data-testid="refresh-button"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            {/* Mobile refresh button - compact */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-md border border-gray-300 text-gray-600 dark:border-white/20 dark:text-white/70 sm:hidden disabled:opacity-50"
              data-testid="refresh-button-mobile"
              aria-label="Refresh data"
            >
              <svg className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div
          className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 animate-slide-up"
          role="alert"
          data-testid="error-banner"
        >
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <span className="font-medium">Connection error:</span> {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !data ? (
        <LoadingSkeleton />
      ) : data ? (
        <PullToRefresh onRefresh={refresh}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
            {/* Stats Bar - always visible */}
            <section
              id="section-stats"
              aria-label="Dashboard statistics"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 stagger-children"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 text-center transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 dark:hover:border-white/20"
                >
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{stat.label}</p>
                </div>
              ))}
            </section>

            {/* Desktop: show all sections */}
            {/* Mobile: show only the active tab's section */}

            {/* Issue Progress Tracker */}
            <section aria-label="Issue progress">
              <ProgressTracker />
            </section>

            {/* Agents Tab */}
            <div className={activeTab !== "agents" ? "hidden md:block" : ""}>
              <div className="space-y-6">
                <div id="section-sessions">
                  <AgentStatusCards />
                </div>

              </div>
            </div>

            {/* PRs Tab */}
            <div className={activeTab !== "prs" ? "hidden md:block" : ""}>
              {/* PR Merge Queue */}
              <section aria-label="PR merge queue">
                <MergeQueue />
              </section>

              <section id="section-prs" aria-label="Recent PRs" className="mt-6">
                <RecentPRs />
              </section>
            </div>

            {/* Activity Tab */}
            <div className={activeTab !== "activity" ? "hidden md:block" : ""}>
              {/* Cost & Token Usage */}
              <section aria-label="Cost and token usage">
                <TokenUsageDashboard />
              </section>

              <section id="section-activity" aria-label="Activity log" className="mt-6">
                <ActivityLog events={activityEvents} maxHeight="max-h-[32rem]" />
              </section>
            </div>
          </div>
        </PullToRefresh>
      ) : null}

      {/* Bottom Navigation - mobile only */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Footer */}
      <Footer />
    </main>
  );
}
