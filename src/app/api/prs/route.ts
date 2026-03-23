import { NextResponse } from "next/server";
import type { RecentPR } from "@/types/prs";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPOS = (
  process.env.FLEET_REPOS || "sergi-izquierdo/fleet-dashboard"
).split(",").map((r) => r.trim());

const FETCH_TIMEOUT_MS = 8000;

async function fetchPRsFromGitHub(): Promise<RecentPR[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const allPRs: RecentPR[] = [];

  for (const repo of REPOS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `https://api.github.com/repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=10`;
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      const pulls = await response.json();

      for (const pr of pulls) {
        let ciStatus: RecentPR["ciStatus"] = "unknown";

        // Try to fetch check runs for the PR head SHA
        if (pr.head?.sha) {
          try {
            const checksController = new AbortController();
            const checksTimeout = setTimeout(
              () => checksController.abort(),
              3000
            );
            const checksUrl = `https://api.github.com/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=1`;
            const checksResp = await fetch(checksUrl, {
              headers,
              signal: checksController.signal,
            });
            clearTimeout(checksTimeout);

            if (checksResp.ok) {
              const checksData = await checksResp.json();
              if (checksData.total_count > 0) {
                const run = checksData.check_runs[0];
                if (run.conclusion === "success") ciStatus = "passing";
                else if (run.conclusion === "failure") ciStatus = "failing";
                else if (run.status === "in_progress" || run.status === "queued")
                  ciStatus = "pending";
              }
            }
          } catch {
            // CI status stays unknown
          }
        }

        allPRs.push({
          title: pr.title,
          repo,
          status: pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open",
          ciStatus,
          createdAt: pr.created_at,
          url: pr.html_url,
          number: pr.number,
          author: pr.user?.login ?? "unknown",
        });
      }
    } catch {
      clearTimeout(timeoutId);
      // If one repo fails, continue with others
      console.error(`Failed to fetch PRs for ${repo}`);
    }
  }

  // Sort by creation date descending and take top 10
  allPRs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allPRs.slice(0, 10);
}

function getMockPRs(): RecentPR[] {
  const now = new Date();
  return [
    {
      title: "feat: add CSV export for reports",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "merged",
      ciStatus: "passing",
      createdAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/19",
      number: 19,
      author: "agent-delta",
    },
    {
      title: "fix: resolve memory leak in websocket handler",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "merged",
      ciStatus: "passing",
      createdAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/20",
      number: 20,
      author: "agent-alpha",
    },
    {
      title: "feat: implement dark mode toggle",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "open",
      ciStatus: "pending",
      createdAt: new Date(now.getTime() - 35 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/21",
      number: 21,
      author: "agent-beta",
    },
    {
      title: "chore: upgrade dependencies to latest",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "open",
      ciStatus: "failing",
      createdAt: new Date(now.getTime() - 50 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/22",
      number: 22,
      author: "agent-gamma",
    },
    {
      title: "fix: pagination on search results",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "open",
      ciStatus: "passing",
      createdAt: new Date(now.getTime() - 65 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/23",
      number: 23,
      author: "agent-gamma",
    },
    {
      title: "feat: add role-based access control",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "open",
      ciStatus: "passing",
      createdAt: new Date(now.getTime() - 80 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/24",
      number: 24,
      author: "agent-alpha",
    },
    {
      title: "docs: update API reference for v2 endpoints",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "merged",
      ciStatus: "passing",
      createdAt: new Date(now.getTime() - 95 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/25",
      number: 25,
      author: "agent-beta",
    },
    {
      title: "feat: real-time notifications via SSE",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "closed",
      ciStatus: "failing",
      createdAt: new Date(now.getTime() - 110 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/26",
      number: 26,
      author: "agent-epsilon",
    },
    {
      title: "refactor: extract auth middleware",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "merged",
      ciStatus: "passing",
      createdAt: new Date(now.getTime() - 130 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/17",
      number: 17,
      author: "agent-delta",
    },
    {
      title: "test: add integration tests for API routes",
      repo: "sergi-izquierdo/fleet-dashboard",
      status: "open",
      ciStatus: "pending",
      createdAt: new Date(now.getTime() - 150 * 60000).toISOString(),
      url: "https://github.com/sergi-izquierdo/fleet-dashboard/pull/16",
      number: 16,
      author: "agent-alpha",
    },
  ];
}

export async function GET() {
  try {
    const prs = await fetchPRsFromGitHub();
    if (prs.length === 0) {
      // No results from GitHub API - return mock data
      return NextResponse.json(getMockPRs(), { status: 200 });
    }
    return NextResponse.json(prs, { status: 200 });
  } catch (error) {
    console.error(
      "Failed to fetch PRs, falling back to mock data:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(getMockPRs(), { status: 200 });
  }
}
