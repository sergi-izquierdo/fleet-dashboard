import type { Metadata } from "next";
import CostAnalytics from "@/components/CostAnalytics";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Costs",
};

export default function CostsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Cost Analytics</h1>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Cost Analytics">
          <CostAnalytics />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
