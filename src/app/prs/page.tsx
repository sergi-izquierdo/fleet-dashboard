import type { Metadata } from "next";
import GroupedPRView from "@/components/GroupedPRView";
import PRTrendChart from "@/components/PRTrendChart";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Pull Requests",
};

export default function PRsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pull Requests</h1>
      <SectionErrorBoundary sectionName="Grouped PR View">
        <GroupedPRView />
      </SectionErrorBoundary>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="PR Merge Trends">
          <PRTrendChart />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
