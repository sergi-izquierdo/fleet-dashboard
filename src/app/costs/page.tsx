import type { Metadata } from "next";
import CostAnalytics from "@/components/CostAnalytics";
import CostByProject from "@/components/CostByProject";
import CostTimeline from "@/components/CostTimeline";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Costs",
};

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cost Analytics</h1>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Cost Analytics">
          <CostAnalytics />
        </SectionErrorBoundary>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Cost by Project">
          <CostByProject />
        </SectionErrorBoundary>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Cost Timeline">
          <CostTimeline />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
