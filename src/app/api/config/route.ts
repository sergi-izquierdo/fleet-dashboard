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

interface RawConfig {
  maxConcurrentAgents?: number;
  maxAgentsPerProject?: number;
  pollIntervalSeconds?: number;
  agentTimeoutMinutes?: number;
  cleanupAfterHours?: number;
  stateRetentionDays?: number;
  planner?: { enabled?: boolean; maxConcurrentWhenHotFiles?: number };
  reviewBeforeMerge?: boolean;
  projects?: { name: string; repo: string; path: string; defaultBranch: string }[];
  labels?: Record<string, string>;
  qualityGateHooks?: QualityGateHook[];
}

function transformConfig(raw: RawConfig): DispatcherConfig {
  return {
    maxConcurrentAgents: raw.maxConcurrentAgents ?? 10,
    maxPerProject: raw.maxAgentsPerProject ?? 3,
    pollIntervalMs: (raw.pollIntervalSeconds ?? 60) * 1000,
    agentTimeoutMs: (raw.agentTimeoutMinutes ?? 60) * 60_000,
    cleanupWindowMs: (raw.cleanupAfterHours ?? 2) * 3_600_000,
    stateRetentionMs: (raw.stateRetentionDays ?? 7) * 86_400_000,
    plannerEnabled: raw.planner?.enabled ?? false,
    reviewBeforeMerge: raw.reviewBeforeMerge ?? false,
    projects: (raw.projects ?? []).map((p) => ({
      repo: p.repo,
      url: `https://github.com/${p.repo}`,
    })),
    labels: raw.labels
      ? Object.entries(raw.labels).map(([key, value]) => ({
          name: value,
          color: key === "local" ? "#3b82f6" : key === "cloud" ? "#8b5cf6" : "#06b6d4",
        }))
      : undefined,
    qualityGateHooks: raw.qualityGateHooks,
  };
}

export async function GET() {
  try {
    const fleetRoot = process.env.FLEET_ROOT || "/home/sergi/agent-fleet";
    const configPath = join(fleetRoot, "orchestrator", "config.json");
    const raw = readFileSync(configPath, "utf-8");
    const parsed: RawConfig = JSON.parse(raw) as RawConfig;
    const config = transformConfig(parsed);
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { error: "Config not found" },
      { status: 404 }
    );
  }
}
