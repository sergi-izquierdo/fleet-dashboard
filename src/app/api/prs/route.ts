import { NextResponse } from "next/server";
import type { RecentPR } from "@/types/prs";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DEFAULT_REPOS = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/pavello-larapita-app",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
];
const REPOS = (process.env.FLEET_REPOS || DEFAULT_REPOS.join(","))
  .split(",")
  .map((r) => r.trim());

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
          hasConflicts: pr.mergeable === false,
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

  return allPRs;
}


export async function GET() {
  try {
    const prs = await fetchPRsFromGitHub();
    return NextResponse.json(prs, { status: 200 });
  } catch (error) {
    console.error(
      "Failed to fetch PRs from GitHub:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json([], { status: 200 });
  }
}
