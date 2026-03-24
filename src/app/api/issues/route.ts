import { NextResponse } from "next/server";
import type { FleetIssueProgress, RepoIssueProgress } from "@/types/issues";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const MANAGED_REPOS = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
  "sergi-izquierdo/pavello-larapita-app",
];

const REPOS = (process.env.FLEET_REPOS || MANAGED_REPOS.join(","))
  .split(",")
  .map((r) => r.trim())
  .filter((r) => MANAGED_REPOS.includes(r));

const FETCH_TIMEOUT_MS = 8000;

interface GitHubIssue {
  pull_request?: unknown;
  state: string;
  labels: Array<{ name: string }>;
}

function categorizeByLabel(
  issues: GitHubIssue[]
): RepoIssueProgress["labels"] {
  const labels = { queued: 0, inProgress: 0, cloud: 0, done: 0 };

  for (const issue of issues) {
    if (issue.state === "closed") {
      labels.done++;
      continue;
    }
    const labelNames = issue.labels.map((l) => l.name);
    if (labelNames.includes("agent-cloud")) {
      labels.cloud++;
    } else if (labelNames.includes("agent-working")) {
      labels.inProgress++;
    } else if (labelNames.includes("agent-local")) {
      labels.queued++;
    } else {
      // Open issues without a recognized label count as queued
      labels.queued++;
    }
  }

  return labels;
}

async function fetchIssuesForRepo(repo: string): Promise<RepoIssueProgress> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const allIssues: GitHubIssue[] = [];

  // Fetch open and closed issues (exclude PRs)
  for (const state of ["open", "closed"] as const) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=100`;
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      const issues: GitHubIssue[] = await response.json();
      // Filter out pull requests (GitHub includes them in the issues endpoint)
      const realIssues = issues.filter((i) => !i.pull_request);
      allIssues.push(...realIssues);
    } catch {
      clearTimeout(timeoutId);
      throw new Error(`Failed to fetch ${state} issues for ${repo}`);
    }
  }

  const total = allIssues.length;
  const closed = allIssues.filter((i) => i.state === "closed").length;
  const open = total - closed;
  const percentComplete = total > 0 ? Math.round((closed / total) * 100) : 0;

  return {
    repo,
    total,
    open,
    closed,
    percentComplete,
    labels: categorizeByLabel(allIssues),
  };
}

function getMockProgress(): FleetIssueProgress {
  const repos: RepoIssueProgress[] = [
    {
      repo: "sergi-izquierdo/fleet-dashboard",
      total: 20,
      open: 8,
      closed: 12,
      percentComplete: 60,
      labels: { queued: 3, inProgress: 3, cloud: 2, done: 12 },
    },
    {
      repo: "sergi-izquierdo/synapse-notes",
      total: 12,
      open: 4,
      closed: 8,
      percentComplete: 67,
      labels: { queued: 1, inProgress: 2, cloud: 1, done: 8 },
    },
    {
      repo: "sergi-izquierdo/autotask-engine",
      total: 10,
      open: 3,
      closed: 7,
      percentComplete: 70,
      labels: { queued: 1, inProgress: 1, cloud: 1, done: 7 },
    },
    {
      repo: "sergi-izquierdo/pavello-larapita-app",
      total: 8,
      open: 2,
      closed: 6,
      percentComplete: 75,
      labels: { queued: 1, inProgress: 1, cloud: 0, done: 6 },
    },
  ];

  const overall = repos.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      open: acc.open + r.open,
      closed: acc.closed + r.closed,
      percentComplete: 0,
      labels: {
        queued: acc.labels.queued + r.labels.queued,
        inProgress: acc.labels.inProgress + r.labels.inProgress,
        cloud: acc.labels.cloud + r.labels.cloud,
        done: acc.labels.done + r.labels.done,
      },
    }),
    {
      total: 0,
      open: 0,
      closed: 0,
      percentComplete: 0,
      labels: { queued: 0, inProgress: 0, cloud: 0, done: 0 },
    }
  );
  overall.percentComplete =
    overall.total > 0
      ? Math.round((overall.closed / overall.total) * 100)
      : 0;

  return { repos, overall };
}

export async function GET() {
  try {
    const repoResults: RepoIssueProgress[] = [];

    for (const repo of REPOS) {
      try {
        const progress = await fetchIssuesForRepo(repo);
        repoResults.push(progress);
      } catch {
        console.error(`Failed to fetch issues for ${repo}`);
      }
    }

    if (repoResults.length === 0) {
      return NextResponse.json(getMockProgress(), { status: 200 });
    }

    const overall = repoResults.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        open: acc.open + r.open,
        closed: acc.closed + r.closed,
        percentComplete: 0,
        labels: {
          queued: acc.labels.queued + r.labels.queued,
          inProgress: acc.labels.inProgress + r.labels.inProgress,
          cloud: acc.labels.cloud + r.labels.cloud,
          done: acc.labels.done + r.labels.done,
        },
      }),
      {
        total: 0,
        open: 0,
        closed: 0,
        percentComplete: 0,
        labels: { queued: 0, inProgress: 0, cloud: 0, done: 0 },
      }
    );
    overall.percentComplete =
      overall.total > 0
        ? Math.round((overall.closed / overall.total) * 100)
        : 0;

    const result: FleetIssueProgress = { repos: repoResults, overall };
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      "Failed to fetch issues, falling back to mock data:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(getMockProgress(), { status: 200 });
  }
}
