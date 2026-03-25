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
import ConfigViewer from "@/components/ConfigViewer";
import FleetActivityTimeline from "@/components/FleetActivityTimeline";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { CollapsibleCard, useIsMobile } from "@/components/CollapsibleCard";
import ProjectFilter from "@/components/ProjectFilter";
import StatsPanel from "@/components/StatsPanel";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const themes = ["light", "dark", "system"] as const;

export default function Home() {
  const [selectedRepo, setSelectedRepo] = useState("");
  const { data, isLoading, error, connectionStatus, countdown, refresh } =
    useDashboardData(selectedRepo || undefined);
  const isMobile = useIsMobile();
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
            <ProjectFilter value={selectedRepo} onChange={setSelectedRepo} />
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
            <NotificationCenter activityLog={data?.activityLog ?? []} />
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
            {/* Stats Bar - hidden when fleet is idle */}
            <CollapsibleCard
              title="Stats"
              id="section-stats"
              ariaLabel="Dashboard statistics"
              defaultExpanded
            >
              <StatsPanel agents={data.agents} prs={data.prs} />
            </CollapsibleCard>

            {/* Fleet Activity Timeline */}
            <CollapsibleCard
              title="Fleet Activity Timeline"
              ariaLabel="Fleet activity timeline"
              defaultExpanded={isMobile !== true}
            >
              <SectionErrorBoundary sectionName="Fleet Activity Timeline">
                <FleetActivityTimeline
                  activityLog={data.activityLog}
                  prs={data.prs}
                />
              </SectionErrorBoundary>
            </CollapsibleCard>

            {/* Desktop: show all sections */}
            {/* Mobile: show only the active tab's section */}

            {/* Issue Progress Tracker */}
            <CollapsibleCard
              title="Issue Progress"
              ariaLabel="Issue progress"
              defaultExpanded={isMobile !== true}
            >
              <SectionErrorBoundary sectionName="Issue Progress">
                <ProgressTracker />
              </SectionErrorBoundary>
            </CollapsibleCard>

            {/* Agents Tab */}
            <div className={activeTab !== "agents" ? "hidden md:block" : ""}>
              <CollapsibleCard
                title="Agent Sessions"
                id="section-sessions"
                ariaLabel="Agent sessions"
                defaultExpanded
              >
                <SectionErrorBoundary sectionName="Agents">
                  <AgentStatusCards />
                </SectionErrorBoundary>
              </CollapsibleCard>
            </div>

            {/* PRs Tab */}
            <div className={activeTab !== "prs" ? "hidden md:block" : ""}>
              {/* PR Merge Queue */}
              <CollapsibleCard
                title="Merge Queue"
                ariaLabel="PR merge queue"
                defaultExpanded={isMobile !== true}
              >
                <SectionErrorBoundary sectionName="Merge Queue">
                  <MergeQueue />
                </SectionErrorBoundary>
              </CollapsibleCard>

              <div className="mt-6">
                <CollapsibleCard
                  title="Recent PRs"
                  id="section-prs"
                  ariaLabel="Recent PRs"
                  defaultExpanded={isMobile !== true}
                >
                  <SectionErrorBoundary sectionName="Recent PRs">
                    <RecentPRs />
                  </SectionErrorBoundary>
                </CollapsibleCard>
              </div>
            </div>

            {/* Activity Tab */}
            <div className={activeTab !== "activity" ? "hidden md:block" : ""}>
              {/* Cost & Token Usage */}
              <CollapsibleCard
                title="Cost & Token Usage"
                ariaLabel="Cost and token usage"
                defaultExpanded={isMobile !== true}
              >
                <SectionErrorBoundary sectionName="Token Usage">
                  <TokenUsageDashboard />
                </SectionErrorBoundary>
              </CollapsibleCard>

              <div className="mt-6">
                <CollapsibleCard
                  title="Activity Log"
                  id="section-activity"
                  ariaLabel="Activity log"
                  defaultExpanded={isMobile !== true}
                >
                  <SectionErrorBoundary sectionName="Activity Log">
                    <ActivityLog events={activityEvents} maxHeight="max-h-[32rem]" />
                  </SectionErrorBoundary>
                </CollapsibleCard>
              </div>
            </div>
          </div>
        </PullToRefresh>
      ) : null}

      {/* Dispatcher Config */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <CollapsibleCard
          title="Dispatcher Config"
          ariaLabel="Dispatcher configuration"
          defaultExpanded={false}
        >
          <SectionErrorBoundary sectionName="Dispatcher Config">
            <ConfigViewer />
          </SectionErrorBoundary>
        </CollapsibleCard>
      </div>

      {/* Bottom Navigation - mobile only */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Footer */}
      <Footer />
    </main>
  );
}
