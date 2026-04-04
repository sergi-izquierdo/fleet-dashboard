import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { CostsTimelineResponse } from "@/types/costsTimeline";
import { buildTimeline } from "@/lib/costsTimeline";

const COSTS_FILE = path.join(
  os.homedir(),
  "agent-fleet",
  "logs",
  "agent-costs.jsonl"
);

const VALID_DAYS = new Set([7, 14, 30, 0]);

export async function GET(request: NextRequest) {
  const daysParam = request.nextUrl.searchParams.get("days") ?? "7";
  const days = parseInt(daysParam, 10);

  if (isNaN(days) || !VALID_DAYS.has(days)) {
    return NextResponse.json(
      { error: "Invalid days parameter. Use 7, 14, 30, or 0 (all time)." },
      { status: 400 }
    );
  }

  let content = "";
  try {
    content = fs.readFileSync(COSTS_FILE, "utf-8");
  } catch {
    const empty: CostsTimelineResponse = {
      dates: [],
      series: [],
      days,
      breakdown: [],
    };
    return NextResponse.json(empty, { status: 200 });
  }

  try {
    const timeline = buildTimeline(content, days);
    return NextResponse.json(timeline satisfies CostsTimelineResponse, {
      status: 200,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process cost data." },
      { status: 500 }
    );
  }
}
