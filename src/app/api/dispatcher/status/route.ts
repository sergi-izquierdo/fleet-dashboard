import { NextResponse } from "next/server";
import { access } from "fs/promises";
import { constants } from "fs";

const PAUSED_FLAG_PATH =
  process.env.DISPATCHER_PAUSED_PATH ||
  "/home/sergi/agent-fleet/orchestrator/.dispatcher-paused";

export async function GET() {
  try {
    await access(PAUSED_FLAG_PATH, constants.F_OK);
    return NextResponse.json({ paused: true });
  } catch {
    return NextResponse.json({ paused: false });
  }
}
