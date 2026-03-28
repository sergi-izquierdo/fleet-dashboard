import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export interface DispatcherProject {
  repo: string;
  url: string;
}

export interface LabelConfig {
  name: string;
  color: string;
}

export interface QualityGateHook {
  name: string;
  command: string;
  enabled: boolean;
}

export interface DispatcherConfig {
  maxConcurrentAgents: number;
  maxPerProject: number;
  pollIntervalMs: number;
  agentTimeoutMs: number;
  cleanupWindowMs: number;
  stateRetentionMs: number;
  plannerEnabled: boolean;
  reviewBeforeMerge: boolean;
  projects: DispatcherProject[];
  labels?: LabelConfig[];
  qualityGateHooks?: QualityGateHook[];
}

export async function GET() {
  try {
    const configPath = join(process.cwd(), "orchestrator", "config.json");
    const raw = readFileSync(configPath, "utf-8");
    const config: DispatcherConfig = JSON.parse(raw) as DispatcherConfig;
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { error: "Config not found" },
      { status: 404 }
    );
  }
}
