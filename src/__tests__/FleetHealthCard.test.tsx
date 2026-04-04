import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import FleetHealthCard from "@/components/FleetHealthCard";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeHealthResponse(overrides: Partial<{
  total: number;
  merged: number;
  failed: number;
  timeout: number;
  recycled: number;
  successRate: number | null;
  repeatFailures: { key: string; issue: number; title: string; repo: string; recycleCount: number }[];
}> = {}) {
  return {
    total: 0,
    merged: 0,
    failed: 0,
    timeout: 0,
    recycled: 0,
    successRate: null,
    repeatFailures: [],
    ...overrides,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(cleanup);

describe("FleetHealthCard", () => {
  it("shows loading skeleton before data arrives", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<FleetHealthCard />);
    expect(screen.getByTestId("health-loading")).toBeDefined();
  });

  it("renders success rate after data loads", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ total: 10, merged: 8, successRate: 80 }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("success-rate")).toBeDefined());
    expect(screen.getByTestId("success-rate").textContent).toBe("80%");
  });

  it("shows — for success rate when no data (null)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ total: 0, successRate: null }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("success-rate")).toBeDefined());
    expect(screen.getByTestId("success-rate").textContent).toBe("—");
  });

  it("renders the donut chart", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ total: 4, merged: 2, failed: 1, timeout: 1 }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("donut-chart")).toBeDefined());
  });

  it("renders donut segments for non-zero values", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        makeHealthResponse({
          total: 4,
          merged: 2,
          failed: 1,
          timeout: 1,
          recycled: 0,
          successRate: 50,
        }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("donut-segment-merged")).toBeDefined());
    expect(screen.getByTestId("donut-segment-failed")).toBeDefined();
    expect(screen.getByTestId("donut-segment-timeout")).toBeDefined();
    // recycled=0 should not render
    expect(screen.queryByTestId("donut-segment-recycled")).toBeNull();
  });

  it("renders health counts", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        makeHealthResponse({ total: 6, merged: 3, failed: 1, timeout: 1, recycled: 1, successRate: 50 }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("health-counts")).toBeDefined());
    const counts = screen.getByTestId("health-counts");
    expect(counts.textContent).toContain("3 merged");
    expect(counts.textContent).toContain("1 failed");
    expect(counts.textContent).toContain("1 timed out");
    expect(counts.textContent).toContain("1 recycled");
  });

  it("shows 'No repeat failures' when repeatFailures is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ repeatFailures: [] }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("no-repeat-failures")).toBeDefined());
    expect(screen.getByTestId("no-repeat-failures").textContent).toContain(
      "No repeat failures",
    );
  });

  it("renders repeat failures list when failures exist", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        makeHealthResponse({
          repeatFailures: [
            { key: "owner/repo/42", issue: 42, title: "Bug keeps failing", repo: "owner/repo", recycleCount: 3 },
          ],
        }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("repeat-failures-list")).toBeDefined());
    expect(screen.getByTestId("repeat-failures-list").textContent).toContain("Bug keeps failing");
    expect(screen.getByTestId("repeat-failures-list").textContent).toContain("×3");
  });

  it("shows error message when fetch fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("health-error")).toBeDefined());
  });

  it("shows error message when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("health-error")).toBeDefined());
    expect(screen.getByTestId("health-error").textContent).toContain("Network error");
  });

  it("applies green color class when successRate >= 80", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ successRate: 90 }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("success-rate")).toBeDefined());
    expect(screen.getByTestId("success-rate").className).toContain("text-green");
  });

  it("applies yellow color class when successRate 50-79", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ successRate: 65 }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("success-rate")).toBeDefined());
    expect(screen.getByTestId("success-rate").className).toContain("text-yellow");
  });

  it("applies red color class when successRate < 50", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeHealthResponse({ successRate: 30 }),
    });
    render(<FleetHealthCard />);
    await waitFor(() => expect(screen.getByTestId("success-rate")).toBeDefined());
    expect(screen.getByTestId("success-rate").className).toContain("text-red");
  });
});
