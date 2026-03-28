"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import AgentStatusCards from "@/components/AgentStatusCards";
import ActivityLog from "@/components/ActivityLog";
import FleetActivityTimeline from "@/components/FleetActivityTimeline";
import FleetActivityHeatmap from "@/components/FleetActivityHeatmap";
import MergeQueue from "@/components/MergeQueue";
import RecentPRs from "@/components/RecentPRs";
import PRTrendChart from "@/components/PRTrendChart";
import PRVelocityChart from "@/components/PRVelocityChart";
import TokenUsageDashboard from "@/components/TokenUsageDashboard";
import ServiceHealth from "@/components/ServiceHealth";
import SystemHealthCard from "@/components/SystemHealthCard";
import DispatcherPipelinePanel from "@/components/DispatcherPipelinePanel";
import ProgressTracker from "@/components/ProgressTracker";
import FleetStatusBanner from "@/components/FleetStatusBanner";
import AutoRefreshIndicator from "@/components/AutoRefreshIndicator";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ToastContainer, showToast } from "@/components/Toast";
import { BottomNav, type MobileTab } from "@/components/BottomNav";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFleetState } from "@/hooks/useFleetState";
import { useFleetEvents } from "@/hooks/useFleetEvents";
import {
  Bot,
  GitPullRequest,
  Server,
  Activity,
  TrendingUp,
  DollarSign,
} from "lucide-react";

const SECTION_IDS: Record<MobileTab, string> = {
  agents: "section-agents",
  prs: "section-prs",
  activity: "section-activity",
  health: "section-health",
};

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-white/30" />
      <h2 className="text-sm font-semibold text-white/70">{title}</h2>
    </div>
  );
}

function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export default function OverviewContent() {
  const { data, isLoading, error, refresh } = useDashboardData();
  useFleetState();
  const prevAgentsRef = useRef<Map<string, string>>(new Map());

  // SSE: trigger immediate refresh on fleet events (polling stays as fallback)
  useFleetEvents(refresh, {
    eventTypes: ["cycle", "agent-started", "agent-completed", "pr-created", "pr-merged"],
  });
  const [activeTab, setActiveTab] = useState<MobileTab>("agents");

  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    const el = document.getElementById(SECTION_IDS[tab]);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Toast notifications for agent status changes
  useEffect(() => {
    if (!data) return;
    const prevAgents = prevAgentsRef.current;

    if (prevAgents.size > 0) {
      for (const agent of data.agents) {
        const prevStatus = prevAgents.get(agent.sessionId);
        if (prevStatus && prevStatus !== agent.status) {
          const typeMap: Record<
            string,
            "success" | "error" | "info" | "warning"
          > = {
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

  const activityEvents = useMemo(
    () =>
      data
        ? data.activityLog.map((evt) => ({
            id: evt.id,
            timestamp: evt.timestamp,
            agentName: evt.agentName,
            eventType: evt.eventType as import("@/components/ActivityLog").EventType,
            description: evt.description,
            project: evt.project,
          }))
        : [],
    [data],
  );

  if (isLoading && !data) {
    return <LoadingSkeleton />;
  }

  if (error && !data) {
    return (
      <>
        <ToastContainer />
        <div
          data-testid="error-banner"
          className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          role="alert"
        >
          <span className="font-medium">Connection error:</span> {error}
        </div>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <ToastContainer />

      {/* Error banner */}
      {error && (
        <div
          data-testid="error-banner"
          className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          role="alert"
        >
          <span className="font-medium">Connection error:</span> {error}
        </div>
      )}

      {/* Fleet Status Banner */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1">
          <FleetStatusBanner agents={data.agents} prs={data.prs} />
        </div>
        <AutoRefreshIndicator onRefresh={refresh} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pb-16 md:pb-0">
        {/* ── Left column (8 cols) ── */}
        <div className="xl:col-span-8 space-y-5">
          {/* Agent Sessions */}
          <Card id="section-agents">
            <SectionHeader icon={Bot} title="Active Agents" />
            <SectionErrorBoundary sectionName="Agents">
              <AgentStatusCards />
            </SectionErrorBoundary>
          </Card>

          {/* Fleet Activity Timeline */}
          <Card>
            <SectionHeader icon={Activity} title="Fleet Activity" />
            <SectionErrorBoundary sectionName="Fleet Activity Timeline">
              <FleetActivityTimeline
                activityLog={data.activityLog}
                prs={data.prs}
              />
            </SectionErrorBoundary>
          </Card>

          {/* Fleet Activity Heatmap */}
          <Card>
            <SectionHeader icon={Activity} title="Fleet Activity Heatmap" />
            <SectionErrorBoundary sectionName="Fleet Activity Heatmap">
              <FleetActivityHeatmap />
            </SectionErrorBoundary>
          </Card>

          {/* PRs row — 2 columns */}
          <div id="section-prs" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <SectionHeader icon={GitPullRequest} title="Merge Queue" />
              <SectionErrorBoundary sectionName="Merge Queue">
                <MergeQueue />
              </SectionErrorBoundary>
            </Card>
            <Card>
              <SectionHeader icon={GitPullRequest} title="Recent PRs" />
              <SectionErrorBoundary sectionName="Recent PRs">
                <RecentPRs />
              </SectionErrorBoundary>
            </Card>
          </div>

          {/* Trends row — responsive columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card>
              <SectionHeader icon={TrendingUp} title="PR Merge Trends" />
              <SectionErrorBoundary sectionName="PR Merge Trends">
                <PRTrendChart />
              </SectionErrorBoundary>
            </Card>
            <Card>
              <SectionHeader icon={TrendingUp} title="PR Velocity" />
              <SectionErrorBoundary sectionName="PR Velocity">
                <PRVelocityChart />
              </SectionErrorBoundary>
            </Card>
            <Card>
              <SectionHeader icon={DollarSign} title="Cost & Tokens" />
              <SectionErrorBoundary sectionName="Token Usage">
                <TokenUsageDashboard />
              </SectionErrorBoundary>
            </Card>
          </div>

          {/* Activity Log */}
          <Card id="section-activity">
            <SectionHeader icon={Activity} title="Activity Log" />
            <SectionErrorBoundary sectionName="Activity Log">
              <ActivityLog events={activityEvents} maxHeight="max-h-80" />
            </SectionErrorBoundary>
          </Card>

          {/* Mobile-only sidebar content */}
          <div className="xl:hidden space-y-5">
            {/* Dispatcher Pipeline */}
            <Card>
              <SectionErrorBoundary sectionName="Dispatcher Pipeline">
                <DispatcherPipelinePanel />
              </SectionErrorBoundary>
            </Card>

            {/* System Health */}
            <Card>
              <SectionHeader icon={Server} title="System Health" />
              <SectionErrorBoundary sectionName="System Health">
                <SystemHealthCard />
              </SectionErrorBoundary>
            </Card>

            {/* Service Health */}
            <Card id="section-health">
              <SectionHeader icon={Server} title="Services" />
              <SectionErrorBoundary sectionName="Service Health">
                <ServiceHealth />
              </SectionErrorBoundary>
            </Card>

            {/* Issue Progress */}
            <Card>
              <SectionHeader icon={TrendingUp} title="Issue Progress" />
              <SectionErrorBoundary sectionName="Issue Progress">
                <ProgressTracker />
              </SectionErrorBoundary>
            </Card>
          </div>
        </div>

        {/* ── Right sidebar (4 cols) — desktop only ── */}
        <div className="hidden xl:block xl:col-span-4 space-y-5">
          {/* Dispatcher Pipeline */}
          <Card>
            <SectionErrorBoundary sectionName="Dispatcher Pipeline">
              <DispatcherPipelinePanel />
            </SectionErrorBoundary>
          </Card>

          {/* System Health */}
          <Card>
            <SectionHeader icon={Server} title="System Health" />
            <SectionErrorBoundary sectionName="System Health">
              <SystemHealthCard />
            </SectionErrorBoundary>
          </Card>

          {/* Service Health */}
          <Card id="section-health">
            <SectionHeader icon={Server} title="Services" />
            <SectionErrorBoundary sectionName="Service Health">
              <ServiceHealth />
            </SectionErrorBoundary>
          </Card>

          {/* Issue Progress */}
          <Card>
            <SectionHeader icon={TrendingUp} title="Issue Progress" />
            <SectionErrorBoundary sectionName="Issue Progress">
              <ProgressTracker />
            </SectionErrorBoundary>
          </Card>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
}
