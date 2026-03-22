import { AgentCard } from "@/components/AgentCard";
import ActivityLog from "@/components/ActivityLog";
import { mockAgents, mockPRs, mockActivityLog } from "@/data/mockData";

export default function Home() {
  const totalAgents = mockAgents.length;
  const activeAgents = mockAgents.filter((a) => a.status === "working").length;
  const errorAgents = mockAgents.filter((a) => a.status === "error").length;
  const prsOpen = mockPRs.filter((p) => p.mergeState === "open").length;
  const prsMerged = mockPRs.filter((p) => p.mergeState === "merged").length;
  const ciPassing = mockPRs.filter((p) => p.ciStatus === "passing").length;

  const stats = [
    { label: "Total Agents", value: totalAgents, color: "text-white" },
    { label: "Active", value: activeAgents, color: "text-blue-400" },
    { label: "Errors", value: errorAgents, color: "text-red-400" },
    { label: "PRs Open", value: prsOpen, color: "text-yellow-400" },
    { label: "PRs Merged", value: prsMerged, color: "text-purple-400" },
    { label: "CI Passing", value: ciPassing, color: "text-green-400" },
  ];

  // Map mock activity events to the shape ActivityLog expects
  const activityEvents = mockActivityLog.map((evt) => ({
    id: evt.id,
    timestamp: evt.timestamp,
    agentName: evt.agentName,
    eventType: evt.eventType as import("@/components/ActivityLog").EventType,
    description: evt.description,
  }));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold">F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Fleet Dashboard</h1>
          </div>
          <p className="text-sm text-white/50">Real-time fleet monitoring</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Stats Bar */}
        <section
          aria-label="Dashboard statistics"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-white/50">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Agent Cards Grid */}
        <section aria-label="Agent cards">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">Agents</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockAgents.map((agent) => (
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

        {/* Activity Log */}
        <section aria-label="Activity log">
          <ActivityLog events={activityEvents} maxHeight="max-h-[32rem]" />
        </section>
      </div>
    </main>
  );
}
