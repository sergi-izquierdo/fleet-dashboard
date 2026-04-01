import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { execFileAsync } from "@/lib/execFileAsync";

const GH_BIN = "/usr/bin/gh";

function getAllowedRepos(): string[] {
  try {
    const configPath = join(process.cwd(), "orchestrator", "config.json");
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw) as { projects?: Array<{ repo: string }> };
    return (config.projects ?? []).map((p) => p.repo);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).repo !== "string" ||
    typeof (body as Record<string, unknown>).prNumber !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing required fields: repo (string), prNumber (number)" },
      { status: 400 }
    );
  }

  const { repo, prNumber } = body as { repo: string; prNumber: number };

  const allowedRepos = getAllowedRepos();
  if (!allowedRepos.includes(repo)) {
    return NextResponse.json(
      { error: `Repository '${repo}' is not in the allowed config` },
      { status: 403 }
    );
  }

  try {
    await execFileAsync(GH_BIN, ["pr", "close", String(prNumber), "--repo", repo]);
    return NextResponse.json({ success: true, message: `PR #${prNumber} closed` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAlreadyClosed =
      message.includes("already closed") || message.includes("not open");
    return NextResponse.json(
      { error: isAlreadyClosed ? "PR is already closed" : message },
      { status: isAlreadyClosed ? 409 : 500 }
    );
  }
}
