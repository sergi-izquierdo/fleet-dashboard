import { Suspense } from "react";
import type { Metadata } from "next";
import AgentStatusCards from "@/components/AgentStatusCards";
import AgentListTable from "@/components/AgentListTable";
import AgentTimeline from "@/components/AgentTimeline";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Agents",
};

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Agent Sessions</h1>
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Agents">
          <AgentStatusCards />
        </SectionErrorBoundary>
      </div>
      <SectionErrorBoundary sectionName="Agent List">
        <Suspense>
          <AgentListTable />
        </Suspense>
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Agent Timeline">
        <AgentTimeline />
      </SectionErrorBoundary>
    </div>
  );
}
