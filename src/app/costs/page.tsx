import type { Metadata } from "next";
import {
  DynamicCostAnalytics,
  DynamicCostByProject,
  DynamicCostTimeline,
} from "@/components/DynamicCharts";
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
          <DynamicCostAnalytics />
        </SectionErrorBoundary>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Cost by Project">
          <DynamicCostByProject />
        </SectionErrorBoundary>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Cost Timeline">
          <DynamicCostTimeline />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
