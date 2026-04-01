import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  extractProjectName,
  parseJSONLEntries,
  groupByProject,
} from "@/lib/costsByProject";
import { GET } from "@/app/api/costs/by-project/route";

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

import * as fs from "fs";

describe("extractProjectName", () => {
  it("extracts project from agent-{prefix}-{num} pattern", () => {
    expect(extractProjectName("agent-fleet-dashboard-261")).toBe(
      "fleet-dashboard"
    );
  });

  it("extracts single-word project names", () => {
    expect(extractProjectName("agent-myproject-1")).toBe("myproject");
  });

  it("extracts multi-hyphen project names", () => {
    expect(extractProjectName("agent-cardmarket-wizard-42")).toBe(
      "cardmarket-wizard"
    );
  });

  it("returns original string if pattern does not match", () => {
    expect(extractProjectName("unknown-agent")).toBe("unknown-agent");
  });

  it("returns original string for agent without number suffix", () => {
    expect(extractProjectName("agent-project")).toBe("agent-project");
  });
});

describe("parseJSONLEntries", () => {
  it("parses valid JSONL lines", () => {
    const content =
      '{"agent":"agent-fleet-1","model":"claude-sonnet","tokens":1000,"cost":0.05,"timestamp":"2026-03-25T10:00:00Z"}\n' +
      '{"agent":"agent-fleet-2","model":"claude-haiku","tokens":500,"cost":0.02,"timestamp":"2026-03-26T12:00:00Z"}';

    const entries = parseJSONLEntries(content);
    expect(entries).toHaveLength(2);
    expect(entries[0].agent).toBe("agent-fleet-1");
    expect(entries[1].cost).toBe(0.02);
  });

  it("skips empty lines", () => {
    const content =
      '{"agent":"agent-a-1","model":"m","tokens":100,"cost":0.01,"timestamp":"2026-03-01T00:00:00Z"}\n\n\n';
    expect(parseJSONLEntries(content)).toHaveLength(1);
  });

  it("skips invalid JSON lines", () => {
    const content =
      '{"agent":"agent-a-1","model":"m","tokens":100,"cost":0.01,"timestamp":"2026-03-01T00:00:00Z"}\nnot-json\n{"agent":"agent-b-2","model":"m","tokens":200,"cost":0.02,"timestamp":"2026-03-02T00:00:00Z"}';
    expect(parseJSONLEntries(content)).toHaveLength(2);
  });

  it("returns empty array for empty content", () => {
    expect(parseJSONLEntries("")).toHaveLength(0);
  });

  it("returns empty array for whitespace-only content", () => {
    expect(parseJSONLEntries("   \n  \n  ")).toHaveLength(0);
  });
});

describe("groupByProject", () => {
  const entries = [
    {
      agent: "agent-fleet-dashboard-1",
      model: "claude-sonnet",
      tokens: 1000,
      cost: 0.05,
      timestamp: "2026-03-25T10:00:00Z",
    },
    {
      agent: "agent-fleet-dashboard-2",
      model: "claude-sonnet",
      tokens: 2000,
      cost: 0.1,
      timestamp: "2026-03-26T12:00:00Z",
    },
    {
      agent: "agent-cardmarket-1",
      model: "claude-haiku",
      tokens: 500,
      cost: 0.02,
      timestamp: "2026-03-24T08:00:00Z",
    },
  ];

  it("groups entries by project", () => {
    const projects = groupByProject(entries);
    expect(projects).toHaveLength(2);
    const fleetProject = projects.find((p) => p.name === "fleet-dashboard");
    expect(fleetProject).toBeDefined();
    expect(fleetProject?.sessionCount).toBe(2);
    expect(fleetProject?.totalTokens).toBe(3000);
    expect(fleetProject?.totalCost).toBeCloseTo(0.15);
  });

  it("tracks lastActive as the most recent timestamp", () => {
    const projects = groupByProject(entries);
    const fleetProject = projects.find((p) => p.name === "fleet-dashboard");
    expect(fleetProject?.lastActive).toBe("2026-03-26T12:00:00Z");
  });

  it("sorts projects by totalCost descending", () => {
    const projects = groupByProject(entries);
    expect(projects[0].name).toBe("fleet-dashboard");
    expect(projects[1].name).toBe("cardmarket");
  });

  it("filters entries by date when since is provided", () => {
    const since = new Date("2026-03-25T00:00:00Z");
    const projects = groupByProject(entries, since);
    // cardmarket entry is before since date, only fleet-dashboard entries remain
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("fleet-dashboard");
  });

  it("returns empty array for empty input", () => {
    expect(groupByProject([])).toHaveLength(0);
  });
});

describe("GET /api/costs/by-project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid period", async () => {
    const req = new NextRequest(
      "http://localhost/api/costs/by-project?period=invalid"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns empty projects when file does not exist", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });

    const req = new NextRequest(
      "http://localhost/api/costs/by-project?period=7d"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toEqual([]);
    expect(body.period).toBe("7d");
  });

  it("returns grouped projects from JSONL file", async () => {
    const jsonl =
      '{"agent":"agent-fleet-1","model":"claude-sonnet","tokens":1000,"cost":0.05,"timestamp":"2026-04-01T10:00:00Z"}\n' +
      '{"agent":"agent-fleet-2","model":"claude-sonnet","tokens":2000,"cost":0.10,"timestamp":"2026-04-01T11:00:00Z"}';

    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(jsonl);

    const req = new NextRequest(
      "http://localhost/api/costs/by-project?period=7d"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].name).toBe("fleet");
    expect(body.projects[0].sessionCount).toBe(2);
  });

  it("defaults to 7d period", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue("");

    const req = new NextRequest("http://localhost/api/costs/by-project");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period).toBe("7d");
  });

  it("returns all entries when period=all", async () => {
    // Old entry that would be filtered out in 7d mode
    const jsonl =
      '{"agent":"agent-oldproject-1","model":"claude-haiku","tokens":100,"cost":0.01,"timestamp":"2020-01-01T00:00:00Z"}';

    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(jsonl);

    const reqAll = new NextRequest(
      "http://localhost/api/costs/by-project?period=all"
    );
    const resAll = await GET(reqAll);
    const bodyAll = await resAll.json();
    expect(bodyAll.projects).toHaveLength(1);

    const req7d = new NextRequest(
      "http://localhost/api/costs/by-project?period=7d"
    );
    const res7d = await GET(req7d);
    const body7d = await res7d.json();
    expect(body7d.projects).toHaveLength(0);
  });
});
