import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { execFileAsync } from "@/lib/execFileAsync";

interface DispatcherProject {
  repo: string;
}

interface DispatcherConfig {
  projects: DispatcherProject[];
}

function getAllowedRepos(): string[] {
  try {
    const configPath = join(process.cwd(), "orchestrator", "config.json");
    const raw = readFileSync(configPath, "utf-8");
    const config: DispatcherConfig = JSON.parse(raw) as DispatcherConfig;
    return config.projects.map((p) => p.repo);
  } catch {
    return [];
  }
}

interface CreateIssueRequestBody {
  repo: unknown;
  title: unknown;
  body: unknown;
  labels: unknown;
}

export async function POST(request: NextRequest) {
  let parsed: CreateIssueRequestBody;
  try {
    parsed = (await request.json()) as CreateIssueRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { repo, title, body, labels } = parsed;

  if (typeof repo !== "string" || !repo.trim()) {
    return NextResponse.json(
      { success: false, error: "repo is required" },
      { status: 400 }
    );
  }

  const allowedRepos = getAllowedRepos();
  if (!allowedRepos.includes(repo)) {
    return NextResponse.json(
      { success: false, error: "repo is not in the allowed projects list" },
      { status: 400 }
    );
  }

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { success: false, error: "title is required" },
      { status: 400 }
    );
  }
  if (title.length > 200) {
    return NextResponse.json(
      { success: false, error: "title must be 200 characters or less" },
      { status: 400 }
    );
  }

  if (!Array.isArray(labels) || !labels.every((l) => typeof l === "string")) {
    return NextResponse.json(
      { success: false, error: "labels must be an array of strings" },
      { status: 400 }
    );
  }
  if (!labels.includes("agent-local")) {
    return NextResponse.json(
      { success: false, error: "labels must include agent-local" },
      { status: 400 }
    );
  }

  const bodyStr = typeof body === "string" ? body : "";

  const args = [
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title.trim(),
    "--body",
    bodyStr,
  ];
  for (const label of labels as string[]) {
    args.push("--label", label);
  }

  try {
    const { stdout } = await execFileAsync("gh", args);
    const url = stdout.trim();
    const match = url.match(/\/issues\/(\d+)$/);
    const issueNumber = match ? parseInt(match[1], 10) : 0;

    return NextResponse.json({ success: true, issueNumber, url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create issue";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
