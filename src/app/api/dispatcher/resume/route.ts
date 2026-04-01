import { NextResponse } from "next/server";
import { unlink } from "fs/promises";

const PAUSED_FLAG_PATH =
  process.env.DISPATCHER_PAUSED_PATH ||
  "/home/sergi/agent-fleet/orchestrator/.dispatcher-paused";

export async function POST() {
  try {
    await unlink(PAUSED_FLAG_PATH);
    return NextResponse.json({ success: true, paused: false });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      // File already gone — idempotent success
      return NextResponse.json({ success: true, paused: false });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to resume dispatcher: ${message}` },
      { status: 500 },
    );
  }
}
