import { NextResponse } from "next/server";
import { DashboardData, Agent, PR, ActivityEvent } from "@/types/dashboard";
import { mockDashboardData } from "@/data/mockData";

const AO_API_URL = process.env.AO_API_URL || "http://localhost:3000";
const FETCH_TIMEOUT_MS = 5000;

function transformAgent(raw: Record<string, unknown>): Agent {
  return {
    name: String(raw.name ?? ""),
    sessionId: String(raw.sessionId ?? ""),
    status: raw.status as Agent["status"],
    issue: {
      title: String((raw.issue as Record<string, unknown>)?.title ?? ""),
      number: Number((raw.issue as Record<string, unknown>)?.number ?? 0),
      url: String((raw.issue as Record<string, unknown>)?.url ?? ""),
    },
    branch: String(raw.branch ?? ""),
    timeElapsed: String(raw.timeElapsed ?? ""),
    ...(raw.pr
      ? {
          pr: {
            url: String((raw.pr as Record<string, unknown>)?.url ?? ""),
            number: Number((raw.pr as Record<string, unknown>)?.number ?? 0),
          },
        }
      : {}),
  };
}

function transformPR(raw: Record<string, unknown>): PR {
  return {
    number: Number(raw.number ?? 0),
    url: String(raw.url ?? ""),
    title: String(raw.title ?? ""),
    ciStatus: raw.ciStatus as PR["ciStatus"],
    reviewStatus: raw.reviewStatus as PR["reviewStatus"],
    mergeState: raw.mergeState as PR["mergeState"],
    author: String(raw.author ?? ""),
    branch: String(raw.branch ?? ""),
  };
}

function transformActivityEvent(raw: Record<string, unknown>): ActivityEvent {
  return {
    id: String(raw.id ?? ""),
    timestamp: String(raw.timestamp ?? ""),
    agentName: String(raw.agentName ?? ""),
    eventType: raw.eventType as ActivityEvent["eventType"],
    description: String(raw.description ?? ""),
  };
}

export function transformAOResponse(
  data: Record<string, unknown>
): DashboardData {
  const agents = Array.isArray(data.agents)
    ? data.agents.map(transformAgent)
    : [];
  const prs = Array.isArray(data.prs) ? data.prs.map(transformPR) : [];
  const activityLog = Array.isArray(data.activityLog)
    ? data.activityLog.map(transformActivityEvent)
    : [];

  return { agents, prs, activityLog };
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(`${AO_API_URL}/api/ao/dashboard`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AO API responded with status ${response.status}`);
    }

    const raw = await response.json();
    const data = transformAOResponse(raw);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(
      "Failed to fetch from AO, falling back to mock data:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(mockDashboardData, { status: 200 });
  }
}
