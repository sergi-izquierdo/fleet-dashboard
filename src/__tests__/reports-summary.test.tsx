import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ReportsSummaryComponent from "@/components/ReportsSummary";
import type { ReportsSummary } from "@/app/api/reports/summary/route";

const mockSummary: ReportsSummary = {
  totalAgents: 42,
  totalPrsCreated: 38,
  totalPrsMerged: 30,
  successRate: 71,
  mostActiveProject: "fleet-dashboard",
  busiestDay: "2026-04-01",
  avgDurationMinutes: 25,
};

describe("ReportsSummaryComponent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading skeleton initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<ReportsSummaryComponent />);
    expect(screen.getByTestId("reports-summary-loading")).toBeInTheDocument();
  });

  it("renders stat cards after successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummary),
        })
      )
    );

    render(<ReportsSummaryComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("reports-stat-card");
    expect(cards.length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText("fleet-dashboard")).toBeInTheDocument();
    expect(screen.getByText("2026-04-01")).toBeInTheDocument();
    expect(screen.getByText("25m")).toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
    );

    render(<ReportsSummaryComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("reports-summary-error")).toBeInTheDocument();
    });
  });

  it("displays dashes for null values", async () => {
    const nullSummary: ReportsSummary = {
      totalAgents: 0,
      totalPrsCreated: 0,
      totalPrsMerged: 0,
      successRate: null,
      mostActiveProject: null,
      busiestDay: null,
      avgDurationMinutes: null,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(nullSummary),
        })
      )
    );

    render(<ReportsSummaryComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeInTheDocument();
    });

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });
});
