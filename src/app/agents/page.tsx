"use client";

import AgentStatusCards from "@/components/AgentStatusCards";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-white mb-4">Agent Sessions</h1>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Agents">
          <AgentStatusCards />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
