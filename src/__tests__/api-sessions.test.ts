import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecAsync = vi.fn();

vi.mock("@/lib/execAsync", () => ({
  execAsync: (...args: unknown[]) => mockExecAsync(...args),
}));

import { GET, parseTmuxList, determineStatus, extractBranch, computeUptime } from "@/app/api/sessions/route";

beforeEach(() => {
  mockExecAsync.mockReset();
});

describe("GET /api/sessions", () => {
  it("returns sessions with parsed data on success", async () => {
    // tmux ls
    mockExecAsync.mockResolvedValueOnce({
      stdout:
        "agent-1: 2 windows (created Mon Mar 23 10:00:00 2026)\nagent-2: 1 windows (created Mon Mar 23 09:00:00 2026)\n",
      stderr: "",
    });
    // capture-pane for agent-1
    mockExecAsync.mockResolvedValueOnce({
      stdout: "$ npm run build\nCompiling...\ngit:(feat/new-feature)\n",
      stderr: "",
    });
    // capture-pane for agent-2
    mockExecAsync.mockResolvedValueOnce({
      stdout: "$ \n",
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toHaveLength(2);
    expect(data.error).toBeUndefined();

    expect(data.sessions[0].name).toBe("agent-1");
    expect(data.sessions[0].status).toBe("working");
    expect(data.sessions[0].branch).toBe("feat/new-feature");
    expect(data.sessions[0].uptime).toBeTruthy();

    expect(data.sessions[1].name).toBe("agent-2");
    expect(data.sessions[1].status).toBe("idle");
  });

  it("returns stuck status when pane output contains errors", async () => {
    mockExecAsync.mockResolvedValueOnce({
      stdout: "worker: 1 windows (created Mon Mar 23 08:00:00 2026)\n",
      stderr: "",
    });
    mockExecAsync.mockResolvedValueOnce({
      stdout:
        "error: ENOENT: no such file or directory\nfatal: unable to continue\n",
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].status).toBe("stuck");
  });

  it("returns empty array with error when tmux is not running", async () => {
    mockExecAsync.mockRejectedValueOnce(
      new Error("no server running on /tmp/tmux-1000/default")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe("tmux is not running");
  });

  it("returns empty array with error when tmux is not installed", async () => {
    mockExecAsync.mockRejectedValueOnce(
      new Error("command not found: tmux")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe("tmux is not running");
  });

  it("returns error message for unexpected exec failures", async () => {
    mockExecAsync.mockRejectedValueOnce(new Error("unexpected failure"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe(
      "Failed to read tmux sessions: unexpected failure"
    );
  });

  it("handles capture-pane failure gracefully for individual sessions", async () => {
    mockExecAsync.mockResolvedValueOnce({
      stdout:
        "agent-1: 1 windows (created Mon Mar 23 10:00:00 2026)\n",
      stderr: "",
    });
    // capture-pane fails
    mockExecAsync.mockRejectedValueOnce(new Error("pane not found"));

    const response = await GET();
    const data = await response.json();

    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].name).toBe("agent-1");
    expect(data.sessions[0].status).toBe("idle");
    expect(data.sessions[0].branch).toBe("unknown");
  });

  it("extracts branch from various prompt formats", async () => {
    mockExecAsync.mockResolvedValueOnce({
      stdout: "dev: 1 windows (created Mon Mar 23 10:00:00 2026)\n",
      stderr: "",
    });
    mockExecAsync.mockResolvedValueOnce({
      stdout: "user@host ~/project (main) $\nRunning tests...\n",
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(data.sessions[0].branch).toBe("main");
  });
});

describe("parseTmuxList", () => {
  it("parses standard tmux ls output", () => {
    const output =
      "my-session: 2 windows (created Mon Mar 23 10:00:00 2026)\n";
    const result = parseTmuxList(output);
    expect(result).toEqual([
      { name: "my-session", created: "Mon Mar 23 10:00:00 2026" },
    ]);
  });

  it("returns empty array for empty output", () => {
    expect(parseTmuxList("")).toEqual([]);
  });
});

describe("determineStatus", () => {
  it("returns stuck for error output", () => {
    expect(determineStatus("error: something broke")).toBe("stuck");
  });

  it("returns working for active output", () => {
    expect(determineStatus("Compiling modules...")).toBe("working");
  });

  it("returns idle for minimal output", () => {
    expect(determineStatus("$\n")).toBe("idle");
  });
});

describe("extractBranch", () => {
  it("extracts from git:(branch) format", () => {
    expect(extractBranch("user git:(main) $")).toBe("main");
  });

  it("extracts from parenthesized branch", () => {
    expect(extractBranch("user@host (feat/test) $")).toBe("feat/test");
  });

  it("returns unknown when no branch found", () => {
    expect(extractBranch("just some text")).toBe("unknown");
  });
});

describe("computeUptime", () => {
  it("returns unknown for invalid date", () => {
    expect(computeUptime("not a date")).toBe("unknown");
  });
});
