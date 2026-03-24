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
  it("returns empty data when Langfuse keys are not configured", async () => {
    const res = await GET(makeRequest("daily"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("timeSeries");
    expect(body).toHaveProperty("byProject");
    expect(body).toHaveProperty("totalCost");
    expect(body).toHaveProperty("totalTokens");
    expect(body).toHaveProperty("connected");
    expect(body.connected).toBe(false);
    expect(Array.isArray(body.timeSeries)).toBe(true);
    expect(Array.isArray(body.byProject)).toBe(true);
    expect(body.totalCost).toBe(0);
    expect(body.totalTokens).toBe(0);
  });

  it("returns empty data with connected false for weekly range", async () => {
    const res = await GET(makeRequest("weekly"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.timeSeries).toHaveLength(0);
    expect(body.byProject).toHaveLength(0);
  });

  it("returns empty data with connected false for monthly range", async () => {
    const res = await GET(makeRequest("monthly"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.timeSeries).toHaveLength(0);
  });

  it("defaults to daily when no range specified", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.timeSeries).toHaveLength(0);
  });

  it("returns 400 for invalid range", async () => {
    const res = await GET(makeRequest("yearly"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid range");
  });

  it("returns empty arrays when Langfuse not configured", async () => {
    const res = await GET(makeRequest("daily"));
    const body = await res.json();
    expect(body.timeSeries).toHaveLength(0);
    expect(body.byProject).toHaveLength(0);
  });
});
