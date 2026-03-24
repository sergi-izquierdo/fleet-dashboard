import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

import { GET } from "@/app/api/sessions/route";
import { parseTmuxList, determineStatus, extractBranch, computeUptime } from "@/lib/sessionHelpers";

function setupMocks(options: {
  tmuxLs?: { stdout: string; stderr: string } | Error;
  panes?: Record<string, string>;
  branches?: Record<string, string>;
}) {
  mockExecFileAsync.mockImplementation(
    (bin: string, args: string[]) => {
      // tmux ls
      if (args[0] === "ls") {
        if (options.tmuxLs instanceof Error) return Promise.reject(options.tmuxLs);
        return Promise.resolve(options.tmuxLs ?? { stdout: "", stderr: "" });
      }
      // tmux capture-pane
      if (args[0] === "capture-pane") {
        const session = args[2]; // -t <session>
        const output = options.panes?.[session] ?? "";
        return Promise.resolve({ stdout: output, stderr: "" });
      }
      // git -C <path> branch --show-current
      if (args[0] === "-C" && args[2] === "branch") {
        const worktreePath = args[1] as string;
        const sessionName = worktreePath.split("/").pop() ?? "";
        const branch = options.branches?.[sessionName];
        if (branch) return Promise.resolve({ stdout: branch + "\n", stderr: "" });
        return Promise.reject(new Error("not a git repo"));
      }
      return Promise.reject(new Error("unexpected call"));
    }
  );
}

beforeEach(() => {
  mockExecFileAsync.mockReset();
});

describe("GET /api/sessions", () => {
  it("returns sessions with parsed data on success", async () => {
    setupMocks({
      tmuxLs: {
        stdout:
          "agent-1: 2 windows (created Mon Mar 23 10:00:00 2026)\nagent-2: 1 windows (created Mon Mar 23 09:00:00 2026)\n",
        stderr: "",
      },
      panes: {
        "agent-1": "$ npm run build\nCompiling...\ngit:(feat/new-feature)\n",
        "agent-2": "$ \n",
      },
      branches: {
        "agent-1": "feat/new-feature",
      },
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
    expect(data.sessions[0].taskName).toBeDefined();

    expect(data.sessions[1].name).toBe("agent-2");
    expect(data.sessions[1].status).toBe("idle");
  });

  it("returns stuck status when pane output contains errors", async () => {
    setupMocks({
      tmuxLs: {
        stdout: "worker: 1 windows (created Mon Mar 23 08:00:00 2026)\n",
        stderr: "",
      },
      panes: {
        worker: "error: ENOENT: no such file or directory\nfatal: unable to continue\n",
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].status).toBe("stuck");
  });

  it("returns empty sessions without error when tmux has no sessions", async () => {
    setupMocks({ tmuxLs: new Error("no server running on /tmp/tmux-1000/default") });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBeUndefined();
  });

  it("returns empty array with error when tmux is not installed", async () => {
    setupMocks({ tmuxLs: new Error("command not found: tmux") });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe("tmux is not running");
  });

  it("returns error message for unexpected exec failures", async () => {
    setupMocks({ tmuxLs: new Error("unexpected failure") });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe(
      "Failed to read tmux sessions: unexpected failure"
    );
  });

  it("handles capture-pane failure gracefully for individual sessions", async () => {
    mockExecFileAsync.mockImplementation(
      (bin: string, args: string[]) => {
        if (args[0] === "ls") {
          return Promise.resolve({
            stdout: "agent-1: 1 windows (created Mon Mar 23 10:00:00 2026)\n",
            stderr: "",
          });
        }
        // All other calls (capture-pane, git) fail
        return Promise.reject(new Error("not found"));
      }
    );

    const response = await GET();
    const data = await response.json();

    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].name).toBe("agent-1");
    expect(data.sessions[0].status).toBe("idle");
    expect(data.sessions[0].branch).toBe("unknown");
  });

  it("extracts branch from git command", async () => {
    setupMocks({
      tmuxLs: {
        stdout: "dev: 1 windows (created Mon Mar 23 10:00:00 2026)\n",
        stderr: "",
      },
      panes: {
        dev: "user@host ~/project (main) $\nRunning tests...\n",
      },
      branches: {
        dev: "main",
      },
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
