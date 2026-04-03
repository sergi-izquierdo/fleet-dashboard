import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import ReportsSummaryPanel from "@/components/ReportsSummary";

afterEach(cleanup);

const mockSummary = {
  totalAgents: 42,
  totalPRsCreated: 38,
  totalPRsMerged: 30,
  successRate: 71,
  mostActiveProject: "fleet-dashboard",
  busiestDay: "2024-03-01",
  avgDurationMinutes: 45,
};

function mockFetchSuccess(data: unknown = mockSummary) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "Server error" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportsSummaryPanel", () => {
  it("shows loading skeletons while fetching", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ReportsSummaryPanel />);
    expect(screen.getByTestId("reports-summary-loading")).toBeInTheDocument();
  });

  it("renders all stat cards after loading", async () => {
    mockFetchSuccess();
    render(<ReportsSummaryPanel />);
    await waitFor(() =>
      expect(screen.getByTestId("reports-summary")).toBeInTheDocument(),
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText("fleet-dashboard")).toBeInTheDocument();
    expect(screen.getByText("2024-03-01")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
  });

  it("shows dashes for null values", async () => {
    mockFetchSuccess({ ...mockSummary, successRate: null, mostActiveProject: null, busiestDay: null, avgDurationMinutes: null });
    render(<ReportsSummaryPanel />);
    await waitFor(() =>
      expect(screen.getByTestId("reports-summary")).toBeInTheDocument(),
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("shows error message on fetch failure", async () => {
    mockFetchError();
    render(<ReportsSummaryPanel />);
    await waitFor(() =>
      expect(screen.getByTestId("reports-summary-error")).toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("fetches from /api/reports/summary", async () => {
    mockFetchSuccess();
    render(<ReportsSummaryPanel />);
    await waitFor(() =>
      expect(screen.getByTestId("reports-summary")).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith("/api/reports/summary");
  });
});
