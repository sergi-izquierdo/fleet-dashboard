import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import OverviewContent from "@/app/OverviewContent";

const testDashboardData = {
  agents: [],
  prs: [],
  activityLog: [],
};

const testServicesData = {
  services: [{ name: "fleet-orchestrator", status: "active", statusText: "active" }],
  timestamp: new Date().toISOString(),
};

const testIssuesData = {
  repos: [],
  overall: { total: 0, open: 0, closed: 0, percentComplete: 0, labels: { queued: 0, inProgress: 0, cloud: 0, done: 0 } },
};

const testDispatcherData = { offline: true };

const testTokenUsageData = {
  timeSeries: [],
  byProject: [],
  totalCost: 0,
  totalTokens: 0,
  source: "mock" as const,
};

function setupFetchMock() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/sessions")) {
      return Promise.resolve({ ok: true, json: async () => ({ sessions: [] }) });
    }
    if (url.includes("/api/services")) {
      return Promise.resolve({ ok: true, json: async () => testServicesData });
    }
    if (url.includes("/api/issues")) {
      return Promise.resolve({ ok: true, json: async () => testIssuesData });
    }
    if (url.includes("/api/dispatcher-status")) {
      return Promise.resolve({ ok: true, json: async () => testDispatcherData });
    }
    if (url.includes("/api/fleet-events")) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.includes("/api/token-usage")) {
      return Promise.resolve({ ok: true, json: async () => testTokenUsageData });
    }
    return Promise.resolve({ ok: true, json: async () => testDashboardData });
  });
}

// jsdom does not implement scrollIntoView — define it so spying works
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

describe("Mobile navigation scroll behavior", () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupFetchMock();
    scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as (arg?: boolean | ScrollIntoViewOptions) => void;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders BottomNav", async () => {
    render(<OverviewContent />);
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();
    });
  });

  it("renders all four BottomNav tabs", async () => {
    render(<OverviewContent />);
    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav-agents")).toBeInTheDocument();
      expect(screen.getByTestId("bottom-nav-prs")).toBeInTheDocument();
      expect(screen.getByTestId("bottom-nav-activity")).toBeInTheDocument();
      expect(screen.getByTestId("bottom-nav-health")).toBeInTheDocument();
    });
  });

  it("renders section-agents id in the DOM after load", async () => {
    render(<OverviewContent />);
    await waitFor(() => {
      expect(document.getElementById("section-agents")).not.toBeNull();
    });
  });

  it("renders section-prs id in the DOM after load", async () => {
    render(<OverviewContent />);
    await waitFor(() => {
      expect(document.getElementById("section-prs")).not.toBeNull();
    });
  });

  it("renders section-activity id in the DOM after load", async () => {
    render(<OverviewContent />);
    await waitFor(() => {
      expect(document.getElementById("section-activity")).not.toBeNull();
    });
  });

  it("renders section-health id in the DOM after load", async () => {
    render(<OverviewContent />);
    await waitFor(() => {
      expect(document.getElementById("section-health")).not.toBeNull();
    });
  });

  it("calls scrollIntoView with smooth behavior when prs tab is clicked", async () => {
    render(<OverviewContent />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav-prs")).toBeInTheDocument();
    });

    const spy = scrollIntoViewSpy;
    spy.mockClear();

    fireEvent.click(screen.getByTestId("bottom-nav-prs"));

    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("calls scrollIntoView with smooth behavior when activity tab is clicked", async () => {
    render(<OverviewContent />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav-activity")).toBeInTheDocument();
    });

    const spy = scrollIntoViewSpy;
    spy.mockClear();

    fireEvent.click(screen.getByTestId("bottom-nav-activity"));

    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("calls scrollIntoView with smooth behavior when health tab is clicked", async () => {
    render(<OverviewContent />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav-health")).toBeInTheDocument();
    });

    const spy = scrollIntoViewSpy;
    spy.mockClear();

    fireEvent.click(screen.getByTestId("bottom-nav-health"));

    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("calls scrollIntoView with smooth behavior when agents tab is clicked", async () => {
    render(<OverviewContent />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav-agents")).toBeInTheDocument();
    });

    const spy = scrollIntoViewSpy;
    spy.mockClear();

    fireEvent.click(screen.getByTestId("bottom-nav-agents"));

    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("updates the active tab when a tab is clicked", async () => {
    render(<OverviewContent />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav-prs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("bottom-nav-prs"));

    expect(screen.getByTestId("bottom-nav-prs")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("bottom-nav-agents")).not.toHaveAttribute("aria-current");
  });
});
