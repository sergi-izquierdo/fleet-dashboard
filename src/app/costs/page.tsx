"use client";

import TokenUsageDashboard from "@/components/TokenUsageDashboard";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { useTokenUsage } from "@/hooks/useTokenUsage";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
      <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/10 mx-auto mb-2" />
      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/10 mx-auto" />
    </div>
  );
}

export default function CostsPage() {
  const { data, isLoading } = useTokenUsage();

  const totalTokens = data?.totalTokens ?? 0;
  const totalCost = data?.totalCost ?? 0;
  const inputTokens = data?.byProject.reduce((s, p) => s + p.inputTokens, 0) ?? 0;
  const outputTokens = data?.byProject.reduce((s, p) => s + p.outputTokens, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        Cost &amp; Token Usage
      </h1>

      {/* KPI Summary Cards */}
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        data-testid="costs-kpi-cards"
      >
        {isLoading && !data ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-center"
              data-testid="kpi-total-tokens"
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTokens(totalTokens)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Total Tokens
              </p>
            </div>
            <div
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-center"
              data-testid="kpi-estimated-cost"
            >
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCost(totalCost)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Estimated Cost
              </p>
            </div>
            <div
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-center"
              data-testid="kpi-input-tokens"
            >
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatTokens(inputTokens)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Input Tokens
              </p>
            </div>
            <div
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-center"
              data-testid="kpi-output-tokens"
            >
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTokens(outputTokens)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Output Tokens
              </p>
            </div>
          </>
        )}
      </div>

      {/* Token Usage Charts + Cost Breakdown Table */}
      <SectionErrorBoundary sectionName="Token Usage Charts">
        <TokenUsageDashboard showStats={false} />
      </SectionErrorBoundary>
    </div>
  );
}
