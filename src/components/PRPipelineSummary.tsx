import type { RecentPR } from "@/types/prs";
import { computePRSummaryStats, formatMergeTime } from "@/lib/prSummaryStats";
import Card from "@/components/Card";

interface StatBoxProps {
  label: string;
  count: number;
  icon: string;
  colorClass: string;
  testId: string;
}

function StatBox({ label, count, icon, colorClass, testId }: StatBoxProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-1 py-3 px-4 text-center min-w-0">
      <span className={`text-xl ${colorClass}`} aria-hidden="true">{icon}</span>
      <span
        className={`text-2xl font-bold tabular-nums ${colorClass}`}
        data-testid={testId}
      >
        {count}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
    </Card>
  );
}

interface PRPipelineSummaryProps {
  prs: RecentPR[];
}

export default function PRPipelineSummary({ prs }: PRPipelineSummaryProps) {
  const { openCount, ciPassingCount, ciFailingCount, merged7dCount, avgMergeTimeMs } =
    computePRSummaryStats(prs);

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02] p-4"
      data-testid="pr-pipeline-summary"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
          <StatBox
            label="Open"
            count={openCount}
            icon="◉"
            colorClass="text-blue-600 dark:text-blue-400"
            testId="pr-summary-open"
          />
          <StatBox
            label="CI Passing"
            count={ciPassingCount}
            icon="✓"
            colorClass="text-green-600 dark:text-green-400"
            testId="pr-summary-ci-passing"
          />
          <StatBox
            label="CI Failing"
            count={ciFailingCount}
            icon="✗"
            colorClass="text-red-600 dark:text-red-400"
            testId="pr-summary-ci-failing"
          />
          <StatBox
            label="Merged (7d)"
            count={merged7dCount}
            icon="⇡"
            colorClass="text-purple-600 dark:text-purple-400"
            testId="pr-summary-merged-7d"
          />
        </div>

        {avgMergeTimeMs !== null && (
          <div
            className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.04] px-4 py-2 shrink-0"
            data-testid="pr-summary-avg-merge-time"
          >
            <span className="text-gray-400 dark:text-gray-500 text-sm" aria-hidden="true">⏱</span>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatMergeTime(avgMergeTimeMs)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg merge time</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
