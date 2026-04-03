import type { Metadata } from "next";
import ReportsSummaryComponent from "@/components/ReportsSummary";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        Fleet Reports
      </h1>
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Summary Statistics
        </h2>
        <SectionErrorBoundary sectionName="Reports Summary">
          <ReportsSummaryComponent />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
