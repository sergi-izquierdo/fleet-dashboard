import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock better-sqlite3 before importing the route
const mockAll = vi.fn();
const mockClose = vi.fn();
const mockPrepare = vi.fn(() => ({ all: mockAll }));

vi.mock("better-sqlite3", () => ({
  default: function MockDatabase() {
    return {
      prepare: mockPrepare,
      close: mockClose,
    };
  },
}));

import { GET } from "@/app/api/events/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/events edge cases", () => {
  it("returns empty array when database returns empty rows", async () => {
    mockAll.mockReturnValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(mockClose).toHaveBeenCalled();
  });

  it("transforms numeric IDs to strings", async () => {
    mockAll.mockReturnValueOnce([
      {
        id: 42,
        timestamp: "2026-03-23T10:00:00Z",
        agent_name: "agent-alpha",
        event_type: "commit",
        description: "Test",
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(data[0].id).toBe("42");
    expect(typeof data[0].id).toBe("string");
  });

  it("maps snake_case fields to camelCase", async () => {
    mockAll.mockReturnValueOnce([
      {
        id: 1,
        timestamp: "2026-03-23T10:00:00Z",
        agent_name: "test-agent",
        event_type: "deploy",
        description: "Deployed v1",
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(data[0]).toHaveProperty("agentName", "test-agent");
    expect(data[0]).toHaveProperty("eventType", "deploy");
    expect(data[0]).not.toHaveProperty("agent_name");
    expect(data[0]).not.toHaveProperty("event_type");
  });

  it("always closes the database even when query succeeds", async () => {
    mockAll.mockReturnValueOnce([]);

    await GET();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("handles generic error during database open", async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error("disk I/O error");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("preserves all event fields in transformation", async () => {
    const row = {
      id: 99,
      timestamp: "2026-01-15T08:30:00Z",
      agent_name: "agent-gamma",
      event_type: "ci_failed",
      description: "Pipeline failed on branch main",
    };

    mockAll.mockReturnValueOnce([row]);

    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: "99",
      timestamp: "2026-01-15T08:30:00Z",
      agentName: "agent-gamma",
      eventType: "ci_failed",
      description: "Pipeline failed on branch main",
    });
  });
});
