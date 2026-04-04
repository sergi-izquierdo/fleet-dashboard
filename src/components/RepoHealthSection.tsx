"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, ExternalLink, Plus } from "lucide-react";
import Card from "@/components/Card";
import { CreateIssueDialog } from "@/components/CreateIssueDialog";
import { healthColorClasses } from "@/lib/repoHealth";
import type { RepoHealthData } from "@/lib/repoHealth";

const NEEDS_ATTENTION_THRESHOLD = 50;

function HealthBadge({ score, tooltip }: { score: number; tooltip: string }) {
  const colors = healthColorClasses(score);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${colors.badge} ${colors.text}`}
      title={tooltip}
      data-testid="health-badge"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {score}
    </span>
  );
}

function buildTooltip(data: RepoHealthData): string {
  const parts = [
    `Score: ${data.healthScore}/100`,
    `Merged PRs (7d): ${data.prsMerged7d}`,
    `Failed agents (7d): ${data.failedAgents7d}`,
    `Open issues: ${data.openIssues}`,
    data.avgMergeTimeMinutes !== null
      ? `Avg merge time: ${data.avgMergeTimeMinutes}m`
      : "Avg merge time: —",
  ];
  return parts.join("\n");
}

function RepoHealthRow({
  data,
  onCreateIssue,
}: {
  data: RepoHealthData;
  onCreateIssue: (repo: string) => void;
}) {
  const repoName = data.repo.split("/").pop() ?? data.repo;
  const hasNoActivity = data.prsMerged7d === 0 && data.failedAgents7d === 0;

  return (
    <div
      className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-white/[0.04] last:border-0"
      data-testid="repo-health-row"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <HealthBadge score={data.healthScore} tooltip={buildTooltip(data)} />
        <a
          href={`https://github.com/${data.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-gray-800 dark:text-white/70 hover:text-blue-600 dark:hover:text-blue-400 truncate flex items-center gap-1"
          data-testid="repo-link"
        >
          {repoName}
          <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-50" />
        </a>
        {hasNoActivity && (
          <span className="text-[10px] text-gray-400 dark:text-white/30 italic flex-shrink-0">
            no activity
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-gray-500 dark:text-white/30">
        <span title="PRs merged (7d)">↑{data.prsMerged7d}</span>
        {data.failedAgents7d > 0 && (
          <span className="text-red-500 dark:text-red-400" title="Failed agents (7d)">
            ✗{data.failedAgents7d}
          </span>
        )}
        <button
          onClick={() => onCreateIssue(data.repo)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/40 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title={`Create issue in ${data.repo}`}
          data-testid="create-issue-btn"
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}

export default function RepoHealthSection() {
  const [data, setData] = useState<RepoHealthData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createIssueRepo, setCreateIssueRepo] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/repos/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RepoHealthData[];
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => void fetchHealth(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (error) {
    return null; // Silently hide on error — non-critical widget
  }

  if (!data) {
    return (
      <Card>
        <div className="animate-pulse space-y-2" data-testid="repo-health-loading">
          <div className="h-3 w-32 rounded bg-gray-100 dark:bg-white/[0.05]" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-gray-50 dark:bg-white/[0.03]" />
          ))}
        </div>
      </Card>
    );
  }

  const needsAttention = data.filter(
    (d) => d.healthScore < NEEDS_ATTENTION_THRESHOLD || (d.prsMerged7d === 0 && d.failedAgents7d === 0)
  );

  const allHealthy =
    needsAttention.length === 0 &&
    data.every((d) => d.healthScore >= NEEDS_ATTENTION_THRESHOLD);

  return (
    <>
      {/* Repo Health Scorecard */}
      <Card>
        <div data-testid="repo-health-section">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white/70">
              Repo Health
            </h2>
            <span className="text-[10px] text-gray-400 dark:text-white/30">last 7 days</span>
          </div>

          <div className="space-y-0" data-testid="repo-health-list">
            {data.map((d) => (
              <RepoHealthRow
                key={d.repo}
                data={d}
                onCreateIssue={setCreateIssueRepo}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Needs Attention */}
      <Card>
        <div data-testid="needs-attention-section">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white/70">
              Needs Attention
            </h2>
          </div>

          {allHealthy ? (
            <div
              className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400"
              data-testid="all-healthy"
            >
              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
              All repos are healthy
            </div>
          ) : (
            <div className="space-y-0" data-testid="needs-attention-list">
              {needsAttention.map((d) => (
                <RepoHealthRow
                  key={d.repo}
                  data={d}
                  onCreateIssue={setCreateIssueRepo}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        open={createIssueRepo !== null}
        onClose={() => setCreateIssueRepo(null)}
        initialRepo={createIssueRepo ?? undefined}
      />
    </>
  );
}
