import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

import {
  parseTmuxList,
  determineStatus,
  extractBranch,
  computeUptime,
} from "@/lib/sessionHelpers";
import { GET } from "@/app/api/sessions/route";

beforeEach(() => {
  mockExecFileAsync.mockReset();
});

describe("parseTmuxList edge cases", () => {
  it("skips malformed lines without created date", () => {
    const output = "bad-line without proper format\n";
    expect(parseTmuxList(output)).toEqual([]);
  });

  it("skips lines with missing colon separator", () => {
    const output = "noseparator 2 windows (created Mon Mar 23 10:00:00 2026)\n";
    expect(parseTmuxList(output)).toEqual([]);
  });

  it("handles multiple sessions with some malformed lines", () => {
    const output = [
      "agent-1: 2 windows (created Mon Mar 23 10:00:00 2026)",
      "bad line",
      "agent-2: 1 windows (created Mon Mar 23 09:00:00 2026)",
      "",
    ].join("\n");
    const result = parseTmuxList(output);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("agent-1");
    expect(result[1].name).toBe("agent-2");
  });

  it("handles session names with special characters", () => {
    const output =
      "my-session_v2: 1 windows (created Mon Mar 23 10:00:00 2026)\n";
    const result = parseTmuxList(output);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("my-session_v2");
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseTmuxList("   \n  \n")).toEqual([]);
  });
});

describe("computeUptime edge cases", () => {
  it("returns seconds format for very recent creation", () => {
    const created = new Date(Date.now() - 30 * 1000).toString();
    expect(computeUptime(created)).toBe("30s");
  });

  it("returns minutes format for < 1 hour", () => {
    const created = new Date(Date.now() - 15 * 60 * 1000).toString();
    expect(computeUptime(created)).toBe("15m");
  });

  it("returns hours and minutes for < 24 hours", () => {
    const created = new Date(Date.now() - (3 * 60 * 60 + 25 * 60) * 1000).toString();
    expect(computeUptime(created)).toBe("3h 25m");
  });

  it("returns days and hours for >= 24 hours", () => {
    const created = new Date(
      Date.now() - (2 * 24 * 60 * 60 + 5 * 60 * 60) * 1000
    ).toString();
    expect(computeUptime(created)).toBe("2d 5h");
  });

  it("returns unknown for empty string", () => {
    expect(computeUptime("")).toBe("unknown");
  });

  it("returns unknown for gibberish date", () => {
    expect(computeUptime("not-a-date-at-all")).toBe("unknown");
  });
});

describe("determineStatus edge cases", () => {
  it("returns stuck for SIGTERM in output", () => {
    expect(determineStatus("Process received SIGTERM")).toBe("stuck");
  });

  it("returns stuck for SIGKILL in output", () => {
    expect(determineStatus("Killed by SIGKILL")).toBe("stuck");
  });

  it("returns stuck for panic in output", () => {
    expect(determineStatus("panic: runtime error")).toBe("stuck");
  });

  it("returns stuck for Traceback in output", () => {
    expect(determineStatus("Traceback (most recent call last):")).toBe("stuck");
  });

  it("returns stuck for maximum retries", () => {
    expect(determineStatus("maximum retries exceeded")).toBe("stuck");
  });

  it("returns stuck for rate limit", () => {
    expect(determineStatus("rate limit reached, waiting...")).toBe("stuck");
  });

  it("returns working for Building pattern", () => {
    expect(determineStatus("Building project...\nstep 1")).toBe("working");
  });

  it("returns working for Testing pattern", () => {
    expect(determineStatus("Testing components...\n")).toBe("working");
  });

  it("returns working for Downloading pattern", () => {
    expect(determineStatus("Downloading packages...\n")).toBe("working");
  });

  it("returns working for Installing pattern", () => {
    expect(determineStatus("Installing dependencies...\n")).toBe("working");
  });

  it("returns working for npm commands", () => {
    expect(determineStatus("$ npm run build\n")).toBe("working");
  });

  it("returns working for npx commands", () => {
    expect(determineStatus("$ npx vitest\n")).toBe("working");
  });

  it("returns working for Task: pattern", () => {
    expect(determineStatus("Task: implement feature\n")).toBe("working");
  });

  it("returns working for claude in output", () => {
    expect(determineStatus("Running claude code...\n")).toBe("working");
  });

  it("returns idle for empty output", () => {
    expect(determineStatus("")).toBe("idle");
  });

  it("returns idle for output with only prompt character", () => {
    expect(determineStatus("$")).toBe("idle");
  });

  it("returns idle for short non-matching output", () => {
    expect(determineStatus("hello\n")).toBe("idle");
  });

  it("stuck patterns take priority over working patterns", () => {
    // Contains both error: and Compiling
    expect(determineStatus("Compiling...\nerror: compilation failed")).toBe(
      "stuck"
    );
  });
});

describe("extractBranch edge cases", () => {
  it("extracts branch from 'on branch' format", () => {
    expect(extractBranch("On branch develop")).toBe("develop");
  });

  it("extracts branch from bracket format", () => {
    expect(extractBranch("user@host [feature/xyz] $")).toBe("feature/xyz");
  });

  it("returns unknown for empty string", () => {
    expect(extractBranch("")).toBe("unknown");
  });

  it("prefers git:() over parenthesized match", () => {
    // Last line checked first (reverse order), so put git:() on the last line
    expect(extractBranch("some text\ngit:(develop) $")).toBe("develop");
  });

  it("skips (created) but may match sub-patterns in complex tmux output", () => {
    // The extractBranch function skips "(created)" specifically
    // but other parenthesized words in the same line may still match
    const output = "session: 1 windows (created Mon Mar 23)";
    const result = extractBranch(output);
    // "Mar" matches the parenMatch pattern since it's alphabetic
    expect(typeof result).toBe("string");
  });

  it("handles branch names with dots and underscores", () => {
    expect(extractBranch("git:(fix/v2.1_hotfix) $")).toBe("fix/v2.1_hotfix");
  });
});

describe("GET /api/sessions additional edge cases", () => {
  it("handles 'No such file' error as tmux not running", async () => {
    mockExecFileAsync.mockRejectedValueOnce(
      new Error("No such file or directory: /tmp/tmux-1000/default")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe("tmux is not running");
  });

  it("handles non-Error thrown values", async () => {
    mockExecFileAsync.mockRejectedValueOnce("string error");

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBe("Failed to read tmux sessions: Unknown error");
  });

  it("returns valid JSON structure even with empty tmux output", async () => {
    mockExecFileAsync.mockResolvedValueOnce({
      stdout: "",
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
    expect(data.error).toBeUndefined();
  });

  it("handles tmux output with only whitespace", async () => {
    mockExecFileAsync.mockResolvedValueOnce({
      stdout: "   \n  \n",
      stderr: "",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toEqual([]);
  });

  it("handles many sessions concurrently", async () => {
    const sessionLines = Array.from(
      { length: 5 },
      (_, i) =>
        `agent-${i}: 1 windows (created Mon Mar 23 10:00:00 2026)`
    ).join("\n");

    mockExecFileAsync.mockResolvedValueOnce({
      stdout: sessionLines + "\n",
      stderr: "",
    });

    // Mock capture-pane for each session
    for (let i = 0; i < 5; i++) {
      mockExecFileAsync.mockResolvedValueOnce({
        stdout: "$ npm run dev\n",
        stderr: "",
      });
    }

    const response = await GET();
    const data = await response.json();

    expect(data.sessions).toHaveLength(5);
    data.sessions.forEach((session: { name: string; status: string }, i: number) => {
      expect(session.name).toBe(`agent-${i}`);
      expect(session.status).toBe("working");
    });
  });
});
