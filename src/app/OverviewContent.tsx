"use client";

import { useEffect, useRef, useMemo } from "react";
import AgentStatusCards from "@/components/AgentStatusCards";
import ActivityLog from "@/components/ActivityLog";
import FleetActivityTimeline from "@/components/FleetActivityTimeline";
import MergeQueue from "@/components/MergeQueue";
import RecentPRs from "@/components/RecentPRs";
import PRTrendChart from "@/components/PRTrendChart";
import PRVelocityChart from "@/components/PRVelocityChart";
import TokenUsageDashboard from "@/components/TokenUsageDashboard";
import ServiceHealth from "@/components/ServiceHealth";
import DispatcherPipelinePanel from "@/components/DispatcherPipelinePanel";
import ProgressTracker from "@/components/ProgressTracker";
import FleetStatusBanner from "@/components/FleetStatusBanner";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ToastContainer, showToast } from "@/components/Toast";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFleetState } from "@/hooks/useFleetState";
import {
  Bot,
  GitPullRequest,
  Server,
  Activity,
  TrendingUp,
  DollarSign,
} from "lucide-react";

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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export default function OverviewContent() {
  const { data, isLoading, error } = useDashboardData();
  useFleetState();
  const prevAgentsRef = useRef<Map<string, string>>(new Map());

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
      <div className="mb-6">
        <FleetStatusBanner agents={data.agents} prs={data.prs} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* ── Left column (8 cols) ── */}
        <div className="xl:col-span-8 space-y-5">
          {/* Agent Sessions */}
          <Card>
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

          {/* PRs row — 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          {/* Trends row — 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
          <Card>
            <SectionHeader icon={Activity} title="Activity Log" />
            <SectionErrorBoundary sectionName="Activity Log">
              <ActivityLog events={activityEvents} maxHeight="max-h-80" />
            </SectionErrorBoundary>
          </Card>
        </div>

        {/* ── Right sidebar (4 cols) ── */}
        <div className="xl:col-span-4 space-y-5">
          {/* Dispatcher Pipeline */}
          <Card>
            <SectionErrorBoundary sectionName="Dispatcher Pipeline">
              <DispatcherPipelinePanel />
            </SectionErrorBoundary>
          </Card>

          {/* Service Health */}
          <Card>
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
    </>
  );
}
