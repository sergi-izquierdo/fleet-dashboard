"use client";

import MergeQueue from "@/components/MergeQueue";
import RecentPRs from "@/components/RecentPRs";
import PRTrendChart from "@/components/PRTrendChart";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function PRsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-white">Pull Requests</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <SectionErrorBoundary sectionName="Merge Queue">
            <MergeQueue />
          </SectionErrorBoundary>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <SectionErrorBoundary sectionName="Recent PRs">
            <RecentPRs />
          </SectionErrorBoundary>
        </div>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="PR Merge Trends">
          <PRTrendChart />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
