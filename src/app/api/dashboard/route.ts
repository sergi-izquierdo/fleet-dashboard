import { NextResponse } from "next/server";
import { mockDashboardData } from "@/data/mockData";
import { transformAOResponse } from "@/lib/transformAOResponse";

const AO_API_URL = process.env.AO_API_URL || "http://localhost:3000";
const FETCH_TIMEOUT_MS = 5000;

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
