import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/token-usage/route";
import { NextRequest } from "next/server";
import { promises as fsPromises } from "fs";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(range?: string): NextRequest {
  const url = new URL("http://localhost:3001/api/token-usage");
  if (range) url.searchParams.set("range", range);
  return new NextRequest(url);
}

beforeEach(() => {
  // Prevent readDispatcherState() from reading real state.json — falls through to mock data
  vi.spyOn(fsPromises, "readFile").mockRejectedValue(new Error("ENOENT"));
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/token-usage", () => {
  it("returns mock data with source=mock when Langfuse keys are not configured", async () => {
    const res = await GET(makeRequest("daily"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("timeSeries");
    expect(body).toHaveProperty("byProject");
    expect(body).toHaveProperty("totalCost");
    expect(body).toHaveProperty("totalTokens");
    expect(body.source).toBe("mock");
    expect(Array.isArray(body.timeSeries)).toBe(true);
    expect(Array.isArray(body.byProject)).toBe(true);
    expect(typeof body.totalCost).toBe("number");
    expect(typeof body.totalTokens).toBe("number");
  });

  it("returns mock data for weekly range", async () => {
    const res = await GET(makeRequest("weekly"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeSeries.length).toBeGreaterThan(0);
    expect(body.byProject.length).toBeGreaterThan(0);
  });

  it("returns mock data for monthly range", async () => {
    const res = await GET(makeRequest("monthly"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeSeries.length).toBeGreaterThan(0);
  });

  it("defaults to daily when no range specified", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeSeries.length).toBeGreaterThan(0);
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
