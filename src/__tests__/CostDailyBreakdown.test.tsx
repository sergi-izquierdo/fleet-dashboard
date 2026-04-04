import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import CostDailyBreakdown from "@/components/CostDailyBreakdown";
import type { DailyBreakdown } from "@/types/costsTimeline";

afterEach(() => {
  cleanup();
});

const sampleBreakdown: DailyBreakdown[] = [
  {
    date: "2026-04-02",
    totalSessions: 3,
    topProject: "fleet",
    transcriptLines: 200,
    projects: [
      { name: "fleet", sessions: 2, transcriptLines: 150 },
      { name: "other", sessions: 1, transcriptLines: 50 },
    ],
  },
  {
    date: "2026-04-01",
    totalSessions: 1,
    topProject: "cardmarket",
    transcriptLines: 80,
    projects: [{ name: "cardmarket", sessions: 1, transcriptLines: 80 }],
  },
];

describe("CostDailyBreakdown", () => {
  it("renders nothing when breakdown is empty", () => {
    const { container } = render(<CostDailyBreakdown breakdown={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders section heading", () => {
    render(<CostDailyBreakdown breakdown={sampleBreakdown} />);
    expect(screen.getByText("Daily Breakdown")).toBeInTheDocument();
  });

  it("renders table with correct data", () => {
    render(<CostDailyBreakdown breakdown={sampleBreakdown} />);
    const table = screen.getByTestId("daily-breakdown-table");
    expect(table).toBeInTheDocument();
    expect(table.textContent).toContain("2026-04-02");
    expect(table.textContent).toContain("2026-04-01");
    expect(table.textContent).toContain("fleet");
    expect(table.textContent).toContain("cardmarket");
  });

  it("shows column headers for sortable columns", () => {
    render(<CostDailyBreakdown breakdown={sampleBreakdown} />);
    const table = screen.getByTestId("daily-breakdown-table");
    expect(table.textContent).toContain("Date");
    expect(table.textContent).toContain("Total Sessions");
    expect(table.textContent).toContain("Top Project");
    expect(table.textContent).toContain("Transcript Lines");
  });

  it("expands row to show per-project breakdown on click", async () => {
    render(<CostDailyBreakdown breakdown={sampleBreakdown} />);
    const row = screen.getByTestId("row-2026-04-02");

    // Before expand: sub-table not visible
    expect(screen.queryByText("other")).not.toBeInTheDocument();

    // Click to expand
    await act(async () => {
      row.click();
    });

    // After expand: project breakdown visible
    expect(screen.getByText("other")).toBeInTheDocument();
  });

  it("collapses row on second click", async () => {
    render(<CostDailyBreakdown breakdown={sampleBreakdown} />);
    const row = screen.getByTestId("row-2026-04-02");

    await act(async () => {
      row.click();
    });

    expect(screen.getByText("other")).toBeInTheDocument();

    await act(async () => {
      row.click();
    });

    expect(screen.queryByText("other")).not.toBeInTheDocument();
  });

  it("shows total sessions count in each row", () => {
    render(<CostDailyBreakdown breakdown={sampleBreakdown} />);
    const table = screen.getByTestId("daily-breakdown-table");
    expect(table.textContent).toContain("3"); // totalSessions for Apr 2
    expect(table.textContent).toContain("1"); // totalSessions for Apr 1
  });
});
