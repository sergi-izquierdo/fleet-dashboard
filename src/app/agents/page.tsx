"use client";

import { useState, useEffect, useCallback } from "react";
import type { Agent } from "@/types/dashboard";
import { AgentCard } from "@/components/AgentCard";
import { AgentDetailModal } from "@/components/AgentDetailModal";
import TerminalViewer from "@/components/TerminalViewer";
import AgentStatusCards from "@/components/AgentStatusCards";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

type StatusFilter = "all" | "active" | "idle" | "completed";

const ACTIVE_STATUSES: Agent["status"][] = ["working"];
const IDLE_STATUSES: Agent["status"][] = ["pr_open", "review_pending"];
const COMPLETED_STATUSES: Agent["status"][] = ["approved", "merged", "error"];

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  idle: "Idle",
  completed: "Completed",
};

function AgentGridSkeleton() {
  return (
    <div
      data-testid="agent-grid-skeleton"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [terminalSession, setTerminalSession] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { agents?: Agent[] } = await res.json();
      setAgents(Array.isArray(data.agents) ? data.agents : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const filteredAgents = agents.filter((agent) => {
    if (statusFilter === "active" && !ACTIVE_STATUSES.includes(agent.status))
      return false;
    if (statusFilter === "idle" && !IDLE_STATUSES.includes(agent.status))
      return false;
    if (
      statusFilter === "completed" &&
      !COMPLETED_STATUSES.includes(agent.status)
    )
      return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.issue.title.toLowerCase().includes(q) ||
        agent.branch.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts: Record<StatusFilter, number> = {
    all: agents.length,
    active: agents.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
    idle: agents.filter((a) => IDLE_STATUSES.includes(a.status)).length,
    completed: agents.filter((a) => COMPLETED_STATUSES.includes(a.status))
      .length,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Agents
        </h1>
        <button
          onClick={fetchAgents}
          data-testid="refresh-agents"
          className="rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Search + status filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search by name, issue, or branch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="agent-search"
          className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <div
          className="flex gap-2 flex-wrap"
          role="group"
          aria-label="Status filters"
        >
          {(["all", "active", "idle", "completed"] as StatusFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                data-testid={`filter-${f}`}
                aria-pressed={statusFilter === f}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                {FILTER_LABELS[f]}
                <span className="ml-1.5 text-gray-400 dark:text-white/30">
                  {statusCounts[f]}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Agent grid */}
      <section aria-label="Agent cards">
        {isLoading ? (
          <AgentGridSkeleton />
        ) : error ? (
          <div
            data-testid="agents-error"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-500 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div
            data-testid="agents-empty"
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-10 text-center text-sm text-gray-500 dark:text-white/40"
          >
            {search || statusFilter !== "all"
              ? "No agents match the current filters."
              : "No agents found."}
          </div>
        ) : (
          <div
            data-testid="agent-grid"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.sessionId}
                agentName={agent.name}
                status={agent.status}
                issueTitle={agent.issue.title}
                branchName={agent.branch}
                timeElapsed={agent.timeElapsed}
                prUrl={agent.pr?.url}
                healthTimeline={agent.healthTimeline}
                onViewTerminal={() => setSelectedAgent(agent.sessionId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Live sessions */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Live Sessions">
          <AgentStatusCards />
        </SectionErrorBoundary>
      </div>

      {/* Detail modal */}
      {selectedAgent && !terminalSession && (
        <AgentDetailModal
          sessionName={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onViewTerminal={() => setTerminalSession(selectedAgent)}
        />
      )}

      {/* Terminal viewer */}
      {terminalSession && (
        <TerminalViewer
          sessionName={terminalSession}
          onClose={() => {
            setTerminalSession(null);
          }}
        />
      )}
    </div>
  );
}
