"use client";

import TokenUsageDashboard from "@/components/TokenUsageDashboard";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function CostsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-white mb-4">Cost & Token Usage</h1>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Token Usage">
          <TokenUsageDashboard />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
