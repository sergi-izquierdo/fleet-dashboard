import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import * as apiCache from "@/lib/apiCache";

interface DispatcherProject {
  repo: string;
}

interface DispatcherConfig {
  projects: DispatcherProject[];
}

export interface QueueIssue {
  repo: string;
  number: number;
  title: string;
  labels: string[];
  createdAt: string;
  url: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  created_at: string;
  html_url: string;
  pull_request?: unknown;
  state: string;
}

function getConfiguredRepos(): string[] {
  try {
    const configPath = join(process.cwd(), "orchestrator", "config.json");
    const raw = readFileSync(configPath, "utf-8");
    const config: DispatcherConfig = JSON.parse(raw) as DispatcherConfig;
    return config.projects.map((p) => p.repo);
  } catch {
    return [];
  }
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const FETCH_TIMEOUT_MS = 8000;

async function fetchQueuedIssuesForRepo(repo: string): Promise<QueueIssue[]> {
  const url = `https://api.github.com/repos/${repo}/issues?state=open&labels=agent-local&per_page=100`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const issues: GitHubIssue[] = await response.json();
    return issues
      .filter((i) => !i.pull_request)
      .map((i) => ({
        repo,
        number: i.number,
        title: i.title,
        labels: i.labels.map((l) => l.name),
        createdAt: i.created_at,
        url: i.html_url,
      }));
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

const CACHE_KEY = "api:issues:queue";
const CACHE_TTL_MS = 30_000;

export async function GET() {
  const cached = apiCache.get<{ issues: QueueIssue[] }>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const repos = getConfiguredRepos();
  const settled = await Promise.allSettled(
    repos.map((repo) => fetchQueuedIssuesForRepo(repo))
  );

  const allIssues: QueueIssue[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      allIssues.push(...result.value);
    }
  }

  // Sort by createdAt ascending (oldest first = picked up first by dispatcher)
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const responseData = { issues: allIssues };
  apiCache.set(CACHE_KEY, responseData, CACHE_TTL_MS);

  return NextResponse.json(responseData, { status: 200 });
}
