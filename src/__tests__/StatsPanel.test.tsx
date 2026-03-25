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
});
