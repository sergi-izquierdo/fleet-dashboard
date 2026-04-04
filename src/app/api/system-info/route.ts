import { NextResponse } from "next/server";
import { stat } from "fs/promises";
import { readFile } from "fs/promises";
import { join } from "path";

export interface SystemInfoResponse {
  nodeVersion: string;
  stateFileSizeBytes: number | null;
  archivedCount: number | null;
  dispatcherStartedAt: string | null;
}

const FLEET_ROOT = process.env.FLEET_ROOT || "/home/sergi/agent-fleet";
const STATE_PATH =
  process.env.FLEET_STATE_PATH || join(FLEET_ROOT, "orchestrator/state.json");
const STATUS_PATH =
  process.env.DISPATCHER_STATUS_PATH ||
  join(FLEET_ROOT, "orchestrator/dispatcher-status.json");

async function getStateFileSize(): Promise<number | null> {
  try {
    const info = await stat(STATE_PATH);
    return info.size;
  } catch {
    return null;
  }
}

async function getArchivedCount(): Promise<number | null> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { completed?: Record<string, unknown> };
    return Object.keys(parsed.completed ?? {}).length;
  } catch {
    return null;
  }
}

async function getDispatcherStartedAt(): Promise<string | null> {
  try {
    const raw = await readFile(STATUS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { cycle?: { startedAt?: string } };
    return parsed.cycle?.startedAt ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [stateFileSizeBytes, archivedCount, dispatcherStartedAt] =
    await Promise.all([getStateFileSize(), getArchivedCount(), getDispatcherStartedAt()]);

  const response: SystemInfoResponse = {
    nodeVersion: process.version,
    stateFileSizeBytes,
    archivedCount,
    dispatcherStartedAt,
  };

  return NextResponse.json(response);
}
