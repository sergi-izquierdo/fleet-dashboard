import { describe, it, expect } from "vitest";
import {
  parseTmuxList,
  computeUptime,
  determineStatus,
  extractBranch,
  extractTaskName,
} from "@/lib/sessionHelpers";

describe("extractTaskName", () => {
  it("extracts issue reference with colon", () => {
    const pane = "Working on issue #42: fix login redirect\n$ npm test";
    expect(extractTaskName(pane)).toBe("fix login redirect");
  });

  it("extracts issue reference with dash", () => {
    const pane = "issue #113 - improve agent session cards\nRunning build...";
    expect(extractTaskName(pane)).toBe("improve agent session cards");
  });

  it("extracts feat/ prefix task", () => {
    const pane = "feat: add dark mode toggle\n$ git status";
    expect(extractTaskName(pane)).toBe("add dark mode toggle");
  });

  it("extracts fix/ prefix task", () => {
    const pane = "fix: resolve crash on startup\nCompiling...";
    expect(extractTaskName(pane)).toBe("resolve crash on startup");
  });

  it("extracts 'working on' pattern", () => {
    const pane = "working on: implement dashboard charts\n$ npm run dev";
    expect(extractTaskName(pane)).toBe("implement dashboard charts");
  });

  it("extracts 'Task:' pattern", () => {
    const pane = "Task: refactor auth module\nBuilding...";
    expect(extractTaskName(pane)).toBe("refactor auth module");
  });

  it("returns unknown when no pattern matches", () => {
    const pane = "$ ls\nnode_modules  src  package.json";
    expect(extractTaskName(pane)).toBe("unknown");
  });

  it("truncates long task names to 100 chars", () => {
    const longTitle = "a".repeat(150);
    const pane = `issue #1: ${longTitle}\n$ npm test`;
    expect(extractTaskName(pane).length).toBe(100);
  });
});

describe("parseTmuxList", () => {
  it("parses standard tmux ls output", () => {
    const output =
      "agent-1: 3 windows (created Mon Mar 23 10:00:00 2026)\nagent-2: 1 windows (created Mon Mar 23 11:00:00 2026)\n";
    const result = parseTmuxList(output);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("agent-1");
    expect(result[1].name).toBe("agent-2");
  });

  it("returns empty array for empty input", () => {
    expect(parseTmuxList("")).toEqual([]);
  });
});

describe("determineStatus", () => {
  it("returns stuck for error patterns", () => {
    expect(determineStatus("error: something failed")).toBe("stuck");
    expect(determineStatus("fatal: not a git repo")).toBe("stuck");
  });

  it("returns working for active patterns", () => {
    expect(determineStatus("Compiling src/index.ts...")).toBe("working");
    expect(determineStatus("Running tests...")).toBe("working");
  });

  it("returns idle for minimal output", () => {
    expect(determineStatus("$")).toBe("idle");
    expect(determineStatus("")).toBe("idle");
  });
});

describe("extractBranch", () => {
  it("extracts branch from git prompt", () => {
    expect(extractBranch("user@host git:(feat/login) $")).toBe("feat/login");
  });

  it("returns unknown when no branch found", () => {
    expect(extractBranch("$ ls")).toBe("unknown");
  });
});
