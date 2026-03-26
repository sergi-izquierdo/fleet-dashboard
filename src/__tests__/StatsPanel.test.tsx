import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import StatsPanel from "@/components/StatsPanel";
import type { Agent, PR } from "@/types/dashboard";

const makeAgent = (status: Agent["status"], sessionId: string): Agent => ({
  name: `agent-${sessionId}`,
  sessionId,
  status,
  issue: { title: "Test issue", number: 1, url: "" },
  branch: "feat/test",
  timeElapsed: "1m 00s",
});

const makePR = (mergeState: PR["mergeState"], ciStatus: PR["ciStatus"], n: number): PR => ({
  number: n,
  url: "",
  title: `PR ${n}`,
  ciStatus,
  reviewStatus: "pending",
  mergeState,
  author: "agent-1",
  branch: "feat/test",
});

afterEach(cleanup);

describe("StatsPanel", () => {
  it("shows idle message when no agents", () => {
    render(<StatsPanel agents={[]} prs={[]} />);
    expect(screen.getByText(/fleet idle/i)).toBeInTheDocument();
  });

  it("renders stat cards when agents exist", () => {
    const agents = [makeAgent("working", "s1"), makeAgent("error", "s2")];
    const prs = [makePR("open", "passing", 1), makePR("merged", "passing", 2)];
    render(<StatsPanel agents={agents} prs={prs} />);

    expect(screen.getByText("Total Agents")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();
    expect(screen.getByText("PRs Open")).toBeInTheDocument();
    expect(screen.getByText("PRs Merged")).toBeInTheDocument();
    expect(screen.getByText("CI Passing")).toBeInTheDocument();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg Merge Time")).toBeInTheDocument();
  });

  it("counts agents correctly", () => {
    const agents = [
      makeAgent("working", "s1"),
      makeAgent("working", "s2"),
      makeAgent("error", "s3"),
    ];
    render(<StatsPanel agents={agents} prs={[]} />);

    const values = screen.getAllByRole("paragraph").map((el) => el.textContent);
    // Total Agents = 3, Active = 2, Errors = 1, PRs Open = 0, PRs Merged = 0, CI Passing = 0
    expect(values).toContain("3");
    expect(values).toContain("2");
    expect(values).toContain("1");
  });

  it("counts PRs correctly", () => {
    const agents = [makeAgent("working", "s1")];
    const prs = [
      makePR("open", "passing", 1),
      makePR("merged", "passing", 2),
      makePR("merged", "failing", 3),
    ];
    render(<StatsPanel agents={agents} prs={prs} />);

    // PRs Open = 1, PRs Merged = 2, CI Passing = 2
    const values = screen.getAllByRole("paragraph").map((el) => el.textContent);
    expect(values).toContain("1"); // PRs Open
    expect(values).toContain("2"); // PRs Merged or CI Passing
  });

  it("shows success rate with correct value when provided", () => {
    const agents = [makeAgent("working", "s1")];
    render(<StatsPanel agents={agents} prs={[]} successRate={85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("shows dash for success rate when not provided", () => {
    const agents = [makeAgent("working", "s1")];
    render(<StatsPanel agents={agents} prs={[]} />);
    // Both Success Rate and Avg Merge Time show "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows avg time to merge in minutes when provided", () => {
    const agents = [makeAgent("working", "s1")];
    render(<StatsPanel agents={agents} prs={[]} avgTimeToMerge={42} />);
    expect(screen.getByText("42m")).toBeInTheDocument();
  });

  it("applies green color for success rate > 80%", () => {
    const agents = [makeAgent("working", "s1")];
    render(<StatsPanel agents={agents} prs={[]} successRate={90} />);
    const rateEl = screen.getByText("90%");
    expect(rateEl.className).toContain("green");
  });

  it("applies yellow color for success rate between 60 and 80", () => {
    const agents = [makeAgent("working", "s1")];
    render(<StatsPanel agents={agents} prs={[]} successRate={70} />);
    const rateEl = screen.getByText("70%");
    expect(rateEl.className).toContain("yellow");
  });

  it("applies red color for success rate < 60%", () => {
    const agents = [makeAgent("working", "s1")];
    render(<StatsPanel agents={agents} prs={[]} successRate={50} />);
    const rateEl = screen.getByText("50%");
    expect(rateEl.className).toContain("red");
  });
});
