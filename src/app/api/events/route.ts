import { NextResponse } from "next/server";
import path from "path";
import os from "os";

const OBSERVABILITY_URL =
  process.env.OBSERVABILITY_URL || "http://localhost:4100";
const FETCH_TIMEOUT_MS = 5000;

interface EventRow {
  id: number | string;
  timestamp: string;
  agent_name: string;
  event_type: string;
  description: string;
}

interface EventPayload {
  id: string;
  timestamp: string;
  agentName: string;
  eventType: string;
  description: string;
}

function getDbPath(): string {
  return (
    process.env.EVENTS_DB_PATH ||
    path.join(os.homedir(), "agent-fleet", "observability", "events.db")
  );
}

/** Try to fetch events from the observability HTTP server */
async function fetchFromObservabilityServer(): Promise<EventPayload[] | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${OBSERVABILITY_URL}/api/events`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((evt: Record<string, unknown>) => ({
        id: String(evt.id ?? ""),
        timestamp: String(evt.timestamp ?? ""),
        agentName: String(evt.agentName ?? evt.agent_name ?? ""),
        eventType: String(evt.eventType ?? evt.event_type ?? ""),
        description: String(evt.description ?? ""),
      }));
    }
    return null;
  } catch {
    return null;
  }
}

/** Try to read events from the local SQLite database */
async function fetchFromDatabase(): Promise<EventPayload[] | null> {
  try {
    const dbPath = getDbPath();

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath, { readonly: true });

    const rows = db
      .prepare(
        `SELECT id, timestamp, agent_name, event_type, description
         FROM events
         ORDER BY timestamp DESC
         LIMIT 100`
      )
      .all() as EventRow[];

    db.close();

    return rows.map((row) => ({
      id: String(row.id),
      timestamp: row.timestamp,
      agentName: row.agent_name,
      eventType: row.event_type,
      description: row.description,
    }));
  } catch {
    return null;
  }
}

export async function GET() {
  // Try observability server first, then fall back to local database
  const fromServer = await fetchFromObservabilityServer();
  if (fromServer !== null && fromServer.length > 0) {
    return NextResponse.json(fromServer, { status: 200 });
  }

  const fromDb = await fetchFromDatabase();
  if (fromDb !== null && fromDb.length > 0) {
    return NextResponse.json(fromDb, { status: 200 });
  }

  return NextResponse.json([], { status: 200 });
}
