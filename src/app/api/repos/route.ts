import { NextResponse } from "next/server";

const MANAGED_REPOS = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
  "sergi-izquierdo/pavello-larapita-app",
];

const REPOS = (process.env.FLEET_REPOS || MANAGED_REPOS.join(","))
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

export async function GET() {
  return NextResponse.json({ repos: REPOS });
}
