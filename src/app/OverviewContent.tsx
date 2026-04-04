"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
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
import MetricsCard from "@/components/MetricsCard";
import AutoRefreshIndicator from "@/components/AutoRefreshIndicator";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ToastContainer, showToast } from "@/components/Toast";
import { BottomNav, type MobileTab } from "@/components/BottomNav";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePRsData } from "@/hooks/usePRsData";
import { useFleetState } from "@/hooks/useFleetState";
import { useFleetEvents } from "@/hooks/useFleetEvents";
import { useDashboardLayout, type SectionId } from "@/hooks/useDashboardLayout";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bot,
  Server,
  Activity,
  TrendingUp,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import type { RecentPR } from "@/types/prs";

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

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

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
      className={`rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] p-4 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  return (
    <button
      {...attributes}
      {...listeners}
      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded text-white/30 hover:text-white/60 focus:opacity-100 focus:outline-none"
      aria-label="Drag to reorder"
      data-testid="drag-handle"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function SortableSection({
  id,
  children,
}: {
  id: SectionId;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    willChange: "transform" as const,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="relative group"
      data-section-id={id}
      variants={cardVariants}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      {children}
    </motion.div>
  );
}

interface SectionContentProps {
  sectionId: SectionId;
  data: NonNullable<ReturnType<typeof useDashboardData>["data"]>;
  activityEvents: {
    id: string;
    timestamp: string;
    agentName: string;
    eventType: import("@/components/ActivityLog").EventType;
    description: string;
    project?: string;
  }[];
  prs: RecentPR[];
}

function SectionContent({ sectionId, data, activityEvents, prs }: SectionContentProps) {
  switch (sectionId) {
    case "agents":
      return (
        <Card id="section-agents">
          <SectionHeader icon={Bot} title="Active Agents" />
          <SectionErrorBoundary sectionName="Agents">
            <AgentStatusCards />
          </SectionErrorBoundary>
        </Card>
      );
    case "metrics":
      return (
        <SectionErrorBoundary sectionName="Fleet Metrics">
          <MetricsCard activityLog={data.activityLog} />
        </SectionErrorBoundary>
      );
    case "timeline":
      return (
        <Card>
          <SectionHeader icon={Activity} title="Fleet Activity" />
          <SectionErrorBoundary sectionName="Fleet Activity Timeline">
            <FleetActivityTimeline
              activityLog={data.activityLog}
              prs={data.prs}
            />
          </SectionErrorBoundary>
        </Card>
      );
    case "heatmap":
      return (
        <Card>
          <SectionHeader icon={Activity} title="Fleet Activity Heatmap" />
          <SectionErrorBoundary sectionName="Fleet Activity Heatmap">
            <FleetActivityHeatmap />
          </SectionErrorBoundary>
        </Card>
      );
    case "prs":
      return (
        <div id="section-prs" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SectionErrorBoundary sectionName="Merge Queue">
            <MergeQueue prs={prs} />
          </SectionErrorBoundary>
          <SectionErrorBoundary sectionName="Recent PRs">
            <RecentPRs prs={prs} />
          </SectionErrorBoundary>
        </div>
      );
    case "trends":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SectionErrorBoundary sectionName="PR Merge Trends">
            <PRTrendChart />
          </SectionErrorBoundary>
          <Card>
            <SectionHeader icon={TrendingUp} title="PR Velocity" />
            <SectionErrorBoundary sectionName="PR Velocity">
              <PRVelocityChart />
            </SectionErrorBoundary>
          </Card>
          <SectionErrorBoundary sectionName="Token Usage">
            <TokenUsageDashboard />
          </SectionErrorBoundary>
        </div>
      );
    case "activity":
      return (
        <div id="section-activity">
          <SectionErrorBoundary sectionName="Activity Log">
            <ActivityLog events={activityEvents} maxHeight="max-h-80" />
          </SectionErrorBoundary>
        </div>
      );
    default:
      return null;
  }
}

export default function OverviewContent() {
  const { data, isLoading, error, refresh } = useDashboardData();
  const { prs, refresh: refreshPRs } = usePRsData();
  useFleetState();
  const prevAgentsRef = useRef<Map<string, string>>(new Map());
  const { order, reorder, resetLayout } = useDashboardLayout();

  // Ref to track active drag — prevents data refreshes from disrupting DnD state
  const isDraggingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced refresh: 300ms delay, skips entirely when a drag is active
  const debouncedRefreshAll = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        refresh();
        refreshPRs();
      }
    }, 300);
  }, [refresh, refreshPRs]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // SSE: trigger debounced refresh on fleet events (polling stays as fallback)
  useFleetEvents(debouncedRefreshAll, {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      isDraggingRef.current = false;
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = order.indexOf(active.id as SectionId);
        const newIndex = order.indexOf(over.id as SectionId);
        reorder(arrayMove(order, oldIndex, newIndex));
      }
    },
    [order, reorder],
  );

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
      <div className="mb-6 flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <FleetStatusBanner agents={data.agents} prs={data.prs} />
        </div>
        <button
          onClick={resetLayout}
          className="flex items-center gap-1 px-2 py-1 text-xs text-white/40 hover:text-white/70 border border-white/[0.06] rounded-lg transition-colors"
          title="Reset dashboard layout to default"
          data-testid="reset-layout-button"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Layout
        </button>
        <AutoRefreshIndicator onRefresh={refresh} />
      </div>

      {/* Main grid */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-12 gap-5 pb-16 md:pb-0"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ── Left column (8 cols) ── */}
        <div className="xl:col-span-8 space-y-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((sectionId) => (
                <SortableSection key={sectionId} id={sectionId}>
                  <SectionContent
                    sectionId={sectionId}
                    data={data}
                    activityEvents={activityEvents}
                    prs={prs}
                  />
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>

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
            <SectionErrorBoundary sectionName="Issue Progress">
              <ProgressTracker />
            </SectionErrorBoundary>
          </div>
        </div>

        {/* ── Right sidebar (4 cols) — desktop only ── */}
        <motion.div
          className="hidden xl:block xl:col-span-4 space-y-5"
          variants={staggerContainer}
        >
          {/* Dispatcher Pipeline */}
          <motion.div variants={cardVariants} transition={{ duration: 0.18, ease: "easeOut" }}>
            <Card>
              <SectionErrorBoundary sectionName="Dispatcher Pipeline">
                <DispatcherPipelinePanel />
              </SectionErrorBoundary>
            </Card>
          </motion.div>

          {/* System Health */}
          <motion.div variants={cardVariants} transition={{ duration: 0.18, ease: "easeOut" }}>
            <Card>
              <SectionHeader icon={Server} title="System Health" />
              <SectionErrorBoundary sectionName="System Health">
                <SystemHealthCard />
              </SectionErrorBoundary>
            </Card>
          </motion.div>

          {/* Service Health */}
          <motion.div variants={cardVariants} transition={{ duration: 0.18, ease: "easeOut" }}>
            <Card id="section-health">
              <SectionHeader icon={Server} title="Services" />
              <SectionErrorBoundary sectionName="Service Health">
                <ServiceHealth />
              </SectionErrorBoundary>
            </Card>
          </motion.div>

          {/* Issue Progress */}
          <motion.div variants={cardVariants} transition={{ duration: 0.18, ease: "easeOut" }}>
            <SectionErrorBoundary sectionName="Issue Progress">
              <ProgressTracker />
            </SectionErrorBoundary>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Mobile bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
}
