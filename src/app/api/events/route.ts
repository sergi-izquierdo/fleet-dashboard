import { NextResponse } from "next/server";
import path from "path";
import os from "os";

interface EventRow {
  id: number | string;
  timestamp: string;
  agent_name: string;
  event_type: string;
  description: string;
}

function getDbPath(): string {
  return (
    process.env.EVENTS_DB_PATH ||
    path.join(os.homedir(), "agent-fleet", "observability", "events.db")
  );
}

export async function GET() {
  try {
    const dbPath = getDbPath();

    // Dynamic import to avoid issues when the native module is not available
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

    const events = rows.map((row) => ({
      id: String(row.id),
      timestamp: row.timestamp,
      agentName: row.agent_name,
      eventType: row.event_type,
      description: row.description,
    }));

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error(
      "Failed to read events database:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json([], { status: 200 });
  }
}
