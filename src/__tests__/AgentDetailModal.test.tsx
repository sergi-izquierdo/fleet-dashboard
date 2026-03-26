import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { AgentDetailModal } from "@/components/AgentDetailModal";
import type { DashboardData, Agent } from "@/types/dashboard";

const mockAgent: Agent = {
  name: "agent-42",
  sessionId: "agent-42",
  status: "working",
  issue: {
    title: "Implement feature X",
    number: 42,
    url: "https://github.com/org/repo/issues/42",
  },
  branch: "feat/issue-42-feature-x",
  timeElapsed: "3m 12s",
  pr: {
    url: "https://github.com/org/repo/pull/99",
    number: 99,
  },
};

const mockDashboardData: DashboardData = {
  agents: [mockAgent],
  prs: [],
  activityLog: [],
};

describe("AgentDetailModal", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    expect(screen.getByTestId("agent-detail-loading")).toBeInTheDocument();
  });

  it("renders agent name in header", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    expect(screen.getByTestId("agent-detail-name")).toHaveTextContent(
      "agent-42"
    );
  });

  it("renders agent detail content after loading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-content")).toBeInTheDocument();
    });
  });

  it("renders status badge", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-status")).toHaveTextContent(
        "Working"
      );
    });
  });

  it("renders issue link with title", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      const link = screen.getByTestId("agent-detail-issue-link");
      expect(link).toHaveTextContent("#42 Implement feature X");
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/org/repo/issues/42"
      );
    });
  });

  it("renders branch name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-branch")).toHaveTextContent(
        "feat/issue-42-feature-x"
      );
    });
  });

  it("renders duration", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-duration")).toHaveTextContent(
        "3m 12s"
      );
    });
  });

  it("renders PR link when pr is present", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      const link = screen.getByTestId("agent-detail-pr-link");
      expect(link).toHaveTextContent("PR #99");
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/org/repo/pull/99"
      );
    });
  });

  it("does not render PR link when agent has no pr", async () => {
    const agentWithoutPR: Agent = { ...mockAgent, pr: undefined };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockDashboardData, agents: [agentWithoutPR] }),
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-content")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("agent-detail-pr-link")).toBeNull();
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-error")).toBeInTheDocument();
    });
  });

  it("shows error when agent is not found in dashboard data", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [], prs: [], activityLog: [] }),
    });
    render(
      <AgentDetailModal sessionName="nonexistent-agent" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-error")).toBeInTheDocument();
    });
  });

  it("calls onClose when backdrop is clicked", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    const onClose = vi.fn();
    render(
      <AgentDetailModal sessionName="agent-42" onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId("agent-detail-modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    const onClose = vi.fn();
    render(
      <AgentDetailModal sessionName="agent-42" onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId("close-agent-detail-modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    const onClose = vi.fn();
    render(
      <AgentDetailModal sessionName="agent-42" onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders terminal button when onViewTerminal is provided", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    const onViewTerminal = vi.fn();
    render(
      <AgentDetailModal
        sessionName="agent-42"
        onClose={vi.fn()}
        onViewTerminal={onViewTerminal}
      />
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("agent-detail-terminal-button")
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("agent-detail-terminal-button"));
    expect(onViewTerminal).toHaveBeenCalledTimes(1);
  });

  it("does not render terminal button when onViewTerminal is not provided", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-content")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("agent-detail-terminal-button")
    ).toBeNull();
  });

  describe("kill functionality", () => {
    it("does not render kill button when onKilled is not provided", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      });
      render(<AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("agent-detail-content")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("agent-detail-kill-button")).toBeNull();
    });

    it("renders kill button when onKilled is provided", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      });
      render(
        <AgentDetailModal
          sessionName="agent-42"
          onClose={vi.fn()}
          onKilled={vi.fn()}
        />
      );
      await waitFor(() => {
        expect(
          screen.getByTestId("agent-detail-kill-button")
        ).toBeInTheDocument();
      });
    });

    it("shows confirmation when kill button is clicked", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      });
      render(
        <AgentDetailModal
          sessionName="agent-42"
          onClose={vi.fn()}
          onKilled={vi.fn()}
        />
      );
      await waitFor(() => {
        expect(
          screen.getByTestId("agent-detail-kill-button")
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("agent-detail-kill-button"));
      expect(
        screen.getByTestId("agent-detail-kill-confirm")
      ).toBeInTheDocument();
    });

    it("calls onKilled and onClose after successful kill", async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDashboardData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sessionName: "agent-42", killed: true }),
        });
      const onClose = vi.fn();
      const onKilled = vi.fn();
      render(
        <AgentDetailModal
          sessionName="agent-42"
          onClose={onClose}
          onKilled={onKilled}
        />
      );
      await waitFor(() => {
        expect(
          screen.getByTestId("agent-detail-kill-button")
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("agent-detail-kill-button"));
      fireEvent.click(screen.getByTestId("agent-detail-kill-confirm-button"));
      await waitFor(() => {
        expect(onKilled).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("shows error when kill fails", async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDashboardData,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Session not found" }),
        });
      render(
        <AgentDetailModal
          sessionName="agent-42"
          onClose={vi.fn()}
          onKilled={vi.fn()}
        />
      );
      await waitFor(() => {
        expect(
          screen.getByTestId("agent-detail-kill-button")
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("agent-detail-kill-button"));
      fireEvent.click(screen.getByTestId("agent-detail-kill-confirm-button"));
      await waitFor(() => {
        expect(
          screen.getByTestId("agent-detail-kill-error")
        ).toHaveTextContent("Session not found");
      });
    });
  });

  it("fetches dashboard data with fresh=true", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });
    global.fetch = fetchMock;
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/dashboard?fresh=true");
    });
  });

  it("matches agent by sessionId when name does not match", async () => {
    const agentWithDifferentName: Agent = {
      ...mockAgent,
      name: "agent-different",
      sessionId: "agent-42",
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockDashboardData,
        agents: [agentWithDifferentName],
      }),
    });
    render(
      <AgentDetailModal sessionName="agent-42" onClose={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-detail-content")).toBeInTheDocument();
    });
  });
});
