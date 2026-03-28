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
  labels: [
    { name: "bug", color: "#d73a4a" },
    { name: "enhancement", color: "#a2eeef" },
    { name: "agent-task", color: "#0075ca" },
  ],
  qualityGateHooks: [
    { name: "lint", command: "npm run lint", enabled: true },
    { name: "test", command: "npm test -- --run", enabled: true },
    { name: "security-audit", command: "npm audit", enabled: false },
  ],
};

describe("Settings page — fleet config viewer", () => {
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

  it("renders the config viewer in loading state initially", () => {
    render(<ConfigViewer />);
    expect(screen.getByTestId("config-loading")).toBeInTheDocument();
  });

  it("renders all config sections after loading", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("config-viewer")).toBeInTheDocument();
    });
    expect(screen.getByText("Runtime")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText(/Managed Projects/)).toBeInTheDocument();
    expect(screen.getByTestId("labels-section")).toBeInTheDocument();
    expect(screen.getByTestId("quality-gate-hooks-section")).toBeInTheDocument();
  });

  it("displays concurrency limits and timing settings", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByText("Max Concurrent Agents")).toBeInTheDocument();
    });
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Max Per Project")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Poll Interval")).toBeInTheDocument();
    expect(screen.getByText("Agent Timeout")).toBeInTheDocument();
  });

  it("displays planner config with feature flags", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByText("Planner")).toBeInTheDocument();
    });
    expect(screen.getByText("Review Before Merge")).toBeInTheDocument();
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

  it("displays label configuration with color badges", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("labels-section")).toBeInTheDocument();
    });
    expect(screen.getByTestId("label-badge-bug")).toBeInTheDocument();
    expect(screen.getByTestId("label-badge-enhancement")).toBeInTheDocument();
    expect(screen.getByTestId("label-badge-agent-task")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.getByText("enhancement")).toBeInTheDocument();
    expect(screen.getByText("agent-task")).toBeInTheDocument();
  });

  it("applies color styling to label badges", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("label-badge-bug")).toBeInTheDocument();
    });
    const bugBadge = screen.getByTestId("label-badge-bug");
    expect(bugBadge).toHaveStyle({ color: "#d73a4a" });
  });

  it("displays quality-gate hooks with active/inactive status", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("quality-gate-hooks-section")).toBeInTheDocument();
    });
    expect(screen.getByText("lint")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("security-audit")).toBeInTheDocument();
    const activeBadges = screen.getAllByText("Active");
    const inactiveBadges = screen.getAllByText("Inactive");
    expect(activeBadges).toHaveLength(2);
    expect(inactiveBadges).toHaveLength(1);
  });

  it("displays hook commands in code format", async () => {
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("quality-gate-hooks-section")).toBeInTheDocument();
    });
    expect(screen.getByText("npm run lint")).toBeInTheDocument();
    expect(screen.getByText("npm test -- --run")).toBeInTheDocument();
    expect(screen.getByText("npm audit")).toBeInTheDocument();
  });

  it("omits labels section when config has no labels", async () => {
    const configWithoutLabels = { ...mockConfig, labels: undefined };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => configWithoutLabels,
    });
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("config-viewer")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("labels-section")).not.toBeInTheDocument();
  });

  it("omits quality-gate hooks section when config has no hooks", async () => {
    const configWithoutHooks = { ...mockConfig, qualityGateHooks: undefined };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => configWithoutHooks,
    });
    render(<ConfigViewer />);
    await waitFor(() => {
      expect(screen.getByTestId("config-viewer")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("quality-gate-hooks-section")).not.toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
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
