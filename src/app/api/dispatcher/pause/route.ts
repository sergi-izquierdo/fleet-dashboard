import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { dirname } from "path";

const PAUSED_FLAG_PATH =
  process.env.DISPATCHER_PAUSED_PATH ||
  "/home/sergi/agent-fleet/orchestrator/.dispatcher-paused";

export async function POST() {
  try {
    await mkdir(dirname(PAUSED_FLAG_PATH), { recursive: true });
    await writeFile(PAUSED_FLAG_PATH, "", { flag: "w" });
    return NextResponse.json({ success: true, paused: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to pause dispatcher: ${message}` },
      { status: 500 },
    );
  }
}
