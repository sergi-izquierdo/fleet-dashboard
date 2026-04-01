import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { CostsByProjectResponse } from "@/types/costsByProject";
import { parseJSONLEntries, groupByProject } from "@/lib/costsByProject";

const COSTS_FILE = path.join(
  os.homedir(),
  "agent-fleet",
  "logs",
  "agent-costs.jsonl"
);

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "7d";

  if (period !== "7d" && period !== "all") {
    return NextResponse.json(
      { error: "Invalid period. Use 7d or all." },
      { status: 400 }
    );
  }

  let content = "";
  try {
    content = fs.readFileSync(COSTS_FILE, "utf-8");
  } catch {
    return NextResponse.json(
      { projects: [], period } satisfies CostsByProjectResponse,
      { status: 200 }
    );
  }

  const entries = parseJSONLEntries(content);

  let since: Date | undefined;
  if (period === "7d") {
    since = new Date();
    since.setDate(since.getDate() - 7);
  }

  const projects = groupByProject(entries, since);

  return NextResponse.json(
    { projects, period } satisfies CostsByProjectResponse,
    { status: 200 }
  );
}
