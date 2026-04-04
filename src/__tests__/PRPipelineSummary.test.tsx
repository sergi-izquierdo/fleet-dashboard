import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import PRPipelineSummary from "@/components/PRPipelineSummary";
import type { RecentPR } from "@/types/prs";

afterEach(cleanup);

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const makePR = (overrides: Partial<RecentPR> & Pick<RecentPR, "status" | "ciStatus" | "number">): RecentPR => ({
  title: "test pr",
  repo: "org/repo",
  createdAt: daysAgo(2),
  url: "https://github.com/org/repo/pull/1",
  author: "agent",
  ...overrides,
});

describe("PRPipelineSummary", () => {
  it("renders the summary bar container", () => {
    render(<PRPipelineSummary prs={[]} />);
    expect(screen.getByTestId("pr-pipeline-summary")).toBeInTheDocument();
  });

  it("shows zeros for all counts when prs is empty", () => {
    render(<PRPipelineSummary prs={[]} />);
    expect(screen.getByTestId("pr-summary-open").textContent).toBe("0");
    expect(screen.getByTestId("pr-summary-ci-passing").textContent).toBe("0");
    expect(screen.getByTestId("pr-summary-ci-failing").textContent).toBe("0");
    expect(screen.getByTestId("pr-summary-merged-7d").textContent).toBe("0");
  });

  it("does not show avg merge time when no merged PRs", () => {
    render(<PRPipelineSummary prs={[]} />);
    expect(screen.queryByTestId("pr-summary-avg-merge-time")).not.toBeInTheDocument();
  });

  it("shows correct open count", () => {
    const prs = [
      makePR({ status: "open", ciStatus: "pending", number: 1 }),
      makePR({ status: "open", ciStatus: "passing", number: 2 }),
      makePR({ status: "merged", ciStatus: "passing", number: 3, mergedAt: daysAgo(1) }),
    ];
    render(<PRPipelineSummary prs={prs} />);
    expect(screen.getByTestId("pr-summary-open").textContent).toBe("2");
  });

  it("shows correct CI passing count (open only)", () => {
    const prs = [
      makePR({ status: "open", ciStatus: "passing", number: 1 }),
      makePR({ status: "open", ciStatus: "failing", number: 2 }),
      makePR({ status: "merged", ciStatus: "passing", number: 3, mergedAt: daysAgo(1) }),
    ];
    render(<PRPipelineSummary prs={prs} />);
    expect(screen.getByTestId("pr-summary-ci-passing").textContent).toBe("1");
  });

  it("shows correct CI failing count (open only)", () => {
    const prs = [
      makePR({ status: "open", ciStatus: "failing", number: 1 }),
      makePR({ status: "open", ciStatus: "failing", number: 2 }),
    ];
    render(<PRPipelineSummary prs={prs} />);
    expect(screen.getByTestId("pr-summary-ci-failing").textContent).toBe("2");
  });

  it("shows correct merged 7d count", () => {
    const prs = [
      makePR({ status: "merged", ciStatus: "passing", number: 1, mergedAt: daysAgo(3) }),
      makePR({ status: "merged", ciStatus: "passing", number: 2, mergedAt: daysAgo(9) }), // >7d ago
    ];
    render(<PRPipelineSummary prs={prs} />);
    expect(screen.getByTestId("pr-summary-merged-7d").textContent).toBe("1");
  });

  it("shows avg merge time when merged PRs exist within 30d", () => {
    const prs = [
      makePR({
        status: "merged",
        ciStatus: "passing",
        number: 1,
        createdAt: daysAgo(5),
        mergedAt: daysAgo(3),
      }),
    ];
    render(<PRPipelineSummary prs={prs} />);
    expect(screen.getByTestId("pr-summary-avg-merge-time")).toBeInTheDocument();
    expect(screen.getByText("Avg merge time")).toBeInTheDocument();
  });

  it("shows all four stat box labels", () => {
    render(<PRPipelineSummary prs={[]} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("CI Passing")).toBeInTheDocument();
    expect(screen.getByText("CI Failing")).toBeInTheDocument();
    expect(screen.getByText("Merged (7d)")).toBeInTheDocument();
  });
});
