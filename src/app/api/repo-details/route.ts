import { NextRequest, NextResponse } from "next/server";
import type {
  RepoDetailData,
  RepoIssueDetail,
  RepoPRDetail,
} from "@/types/issues";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const MANAGED_REPOS = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
  "sergi-izquierdo/pavello-larapita-app",
];

const FETCH_TIMEOUT_MS = 8000;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchOpenIssues(
  repo: string,
  headers: Record<string, string>
): Promise<RepoIssueDetail[]> {
  const url = `https://api.github.com/repos/${repo}/issues?state=open&per_page=100`;
  const response = await fetchWithTimeout(url, headers);
  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const issues: Array<{
    pull_request?: unknown;
    number: number;
    title: string;
    labels: Array<{ name: string }>;
    html_url: string;
  }> = await response.json();

  return issues
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      labels: i.labels.map((l) => l.name),
      url: i.html_url,
    }));
}

async function fetchOpenPRs(
  repo: string,
  headers: Record<string, string>
): Promise<RepoPRDetail[]> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=open&sort=created&direction=desc&per_page=20`;
  const response = await fetchWithTimeout(url, headers);
  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const pulls: Array<{
    number: number;
    title: string;
    html_url: string;
    user?: { login: string };
    head?: { sha: string };
    created_at: string;
  }> = await response.json();

  const prs: RepoPRDetail[] = [];
  for (const pr of pulls) {
    let ciStatus: RepoPRDetail["ciStatus"] = "unknown";
    if (pr.head?.sha) {
      try {
        const checksUrl = `https://api.github.com/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=1`;
        const checksResp = await fetchWithTimeout(checksUrl, headers, 3000);
        if (checksResp.ok) {
          const checksData: {
            total_count: number;
            check_runs: Array<{ conclusion: string | null; status: string }>;
          } = await checksResp.json();
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
    prs.push({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login ?? "unknown",
      ciStatus,
      createdAt: pr.created_at,
    });
  }

  return prs;
}

async function fetchRecentMergedPRs(
  repo: string,
  headers: Record<string, string>
): Promise<RepoPRDetail[]> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`;
  const response = await fetchWithTimeout(url, headers);
  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const pulls: Array<{
    number: number;
    title: string;
    html_url: string;
    user?: { login: string };
    merged_at: string | null;
    created_at: string;
  }> = await response.json();

  return pulls
    .filter((pr) => pr.merged_at !== null)
    .slice(0, 5)
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login ?? "unknown",
      ciStatus: "passing" as const,
      createdAt: pr.created_at,
    }));
}

export async function GET(request: NextRequest) {
  const repo = request.nextUrl.searchParams.get("repo");

  if (!repo || !MANAGED_REPOS.includes(repo)) {
    return NextResponse.json(
      { error: "Invalid or missing repo parameter" },
      { status: 400 }
    );
  }

  try {
    const headers = getHeaders();
    const [openIssues, openPRs, recentMergedPRs] = await Promise.all([
      fetchOpenIssues(repo, headers),
      fetchOpenPRs(repo, headers),
      fetchRecentMergedPRs(repo, headers),
    ]);

    const result: RepoDetailData = {
      repo,
      openIssues,
      openPRs,
      recentMergedPRs,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      `Failed to fetch details for ${repo}:`,
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: `Failed to fetch details for ${repo}` },
      { status: 500 }
    );
  }
}
