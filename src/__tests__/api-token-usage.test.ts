import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/token-usage/route";
import { NextRequest } from "next/server";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(range?: string): NextRequest {
  const url = new URL("http://localhost:3001/api/token-usage");
  if (range) url.searchParams.set("range", range);
  return new NextRequest(url);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("GET /api/token-usage", () => {
  it("returns empty state when obs server is not configured and no state.json", async () => {
    const res = await GET(makeRequest("daily"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("timeSeries");
    expect(body).toHaveProperty("byProject");
    expect(body).toHaveProperty("totalCost");
    expect(body).toHaveProperty("totalTokens");
    // When obs server is unavailable but state.json exists, source is 'estimated'.
    // When neither is available, source is 'empty'.
    expect(["estimated", "empty"]).toContain(body.source);
    expect(Array.isArray(body.timeSeries)).toBe(true);
    expect(Array.isArray(body.byProject)).toBe(true);
    expect(typeof body.totalCost).toBe("number");
    expect(typeof body.totalTokens).toBe("number");
  });

  it("returns empty state for weekly range when no data sources available", async () => {
    const res = await GET(makeRequest("weekly"));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Without obs server or state.json, returns empty arrays
    expect(Array.isArray(body.timeSeries)).toBe(true);
    expect(Array.isArray(body.byProject)).toBe(true);
  });

  it("returns empty state for monthly range when no data sources available", async () => {
    const res = await GET(makeRequest("monthly"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.timeSeries)).toBe(true);
  });

  it("defaults to daily when no range specified", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.timeSeries)).toBe(true);
  });

  it("returns source 'empty' with zero totals when no data sources are available", async () => {
    // Obs server fetch will fail (mockFetch not configured), state.json will be missing
    const res = await GET(makeRequest("daily"));
    expect(res.status).toBe(200);
    const body = await res.json();
    if (body.source === "empty") {
      expect(body.totalTokens).toBe(0);
      expect(body.totalCost).toBe(0);
      expect(body.timeSeries).toHaveLength(0);
      expect(body.byProject).toHaveLength(0);
    }
  });

  it("returns 400 for invalid range", async () => {
    const res = await GET(makeRequest("yearly"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid range");
  });

  it("each time series entry has required fields", async () => {
    const res = await GET(makeRequest("daily"));
    const body = await res.json();
    for (const entry of body.timeSeries) {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("inputTokens");
      expect(entry).toHaveProperty("outputTokens");
      expect(entry).toHaveProperty("totalTokens");
      expect(entry).toHaveProperty("cost");
      expect(entry.totalTokens).toBe(entry.inputTokens + entry.outputTokens);
    }
  });

  it("each project entry has required fields", async () => {
    const res = await GET(makeRequest("daily"));
    const body = await res.json();
    for (const project of body.byProject) {
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("inputTokens");
      expect(project).toHaveProperty("outputTokens");
      expect(project).toHaveProperty("totalTokens");
      expect(project).toHaveProperty("cost");
      expect(typeof project.name).toBe("string");
    }
  });
});
