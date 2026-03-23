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

describe("GET /api/events", () => {
  it("returns transformed events from the database", async () => {
    const dbRows = [
      {
        id: 1,
        timestamp: "2026-03-23T10:00:00Z",
        agent_name: "agent-alpha",
        event_type: "commit",
        description: "Pushed 3 commits",
      },
      {
        id: 2,
        timestamp: "2026-03-23T09:00:00Z",
        agent_name: "agent-beta",
        event_type: "pr_created",
        description: "Opened PR #42",
      },
    ];

    mockAll.mockReturnValueOnce(dbRows);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toEqual({
      id: "1",
      timestamp: "2026-03-23T10:00:00Z",
      agentName: "agent-alpha",
      eventType: "commit",
      description: "Pushed 3 commits",
    });
    expect(data[1]).toEqual({
      id: "2",
      timestamp: "2026-03-23T09:00:00Z",
      agentName: "agent-beta",
      eventType: "pr_created",
      description: "Opened PR #42",
    });

    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY timestamp DESC")
    );
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT 100")
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns empty array when database is missing", async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error("SQLITE_CANTOPEN: unable to open database file");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns empty array when query fails", async () => {
    mockAll.mockImplementationOnce(() => {
      throw new Error("no such table: events");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
