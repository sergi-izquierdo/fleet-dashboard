import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import IssueQueueTable from "@/components/IssueQueueTable";

export const metadata: Metadata = {
  title: "Issue Queue",
};

export default function QueuePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Issue Queue</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
          Pending issues with the agent-local label, sorted oldest first.
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Issue Queue">
          <IssueQueueTable />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
