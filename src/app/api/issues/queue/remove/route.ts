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

interface RemoveFromQueueBody {
  repo: unknown;
  issueNumber: unknown;
}

export async function POST(request: NextRequest) {
  let parsed: RemoveFromQueueBody;
  try {
    parsed = (await request.json()) as RemoveFromQueueBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { repo, issueNumber } = parsed;

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

  if (typeof issueNumber !== "number" || !Number.isInteger(issueNumber) || issueNumber < 1) {
    return NextResponse.json(
      { success: false, error: "issueNumber must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    await execFileAsync("gh", [
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      repo,
      "--remove-label",
      "agent-local",
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove label";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
