import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import ConfigViewer from "@/components/ConfigViewer";

const mockConfig = {
  maxConcurrentAgents: 5,
  maxPerProject: 2,
  pollIntervalMs: 30000,
  agentTimeoutMs: 3600000,
  cleanupWindowMs: 86400000,
  stateRetentionMs: 604800000,
  plannerEnabled: true,
  reviewBeforeMerge: false,
  projects: [
    { repo: "org/repo-one", url: "https://github.com/org/repo-one" },
    { repo: "org/repo-two", url: "https://github.com/org/repo-two" },
  ],
};

describe("ConfigViewer", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    render(<ConfigViewer />);
    expect(screen.getByTestId("config-loading")).toBeInTheDocument();
  });

  it("renders config data after loading", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("config-viewer")).toBeInTheDocument();
    });
  });

  it("displays runtime settings", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByText("Max Concurrent Agents")).toBeInTheDocument();
    });
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Max Per Project")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Poll Interval")).toBeInTheDocument();
    expect(screen.getByText("30s")).toBeInTheDocument();
    expect(screen.getByText("Agent Timeout")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("Cleanup Window")).toBeInTheDocument();
    expect(screen.getByText("1d")).toBeInTheDocument();
    expect(screen.getByText("State Retention")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("displays feature flags with correct badge states", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByText("Planner")).toBeInTheDocument();
    });
    const enabledBadges = screen.getAllByText("Enabled");
    const disabledBadges = screen.getAllByText("Disabled");
    expect(enabledBadges.length).toBeGreaterThanOrEqual(1);
    expect(disabledBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("displays managed projects with repo links", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByText("org/repo-one")).toBeInTheDocument();
    });
    expect(screen.getByText("org/repo-two")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /open .* on github/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://github.com/org/repo-one");
    expect(links[1]).toHaveAttribute("href", "https://github.com/org/repo-two");
  });

  it("shows error when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Config not available")
    );
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("config-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Failed to load config")).toBeInTheDocument();
  });

  it("shows error when response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Not found" }),
    });
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("config-error")).toBeInTheDocument();
    });
  });
});
