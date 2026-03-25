import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { AgentCard, AgentStatus } from "@/components/AgentCard";

const defaultProps = {
  agentName: "agent-42",
  status: "working" as AgentStatus,
  issueTitle: "Implement feature X",
  branchName: "feat/issue-42-feature-x",
  timeElapsed: "3m 12s",
};

describe("AgentCard", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it("renders agent name", () => {
    render(<AgentCard {...defaultProps} />);
    expect(screen.getByText("agent-42")).toBeInTheDocument();
  });

  it("renders issue title", () => {
    render(<AgentCard {...defaultProps} />);
    expect(screen.getByText("Implement feature X")).toBeInTheDocument();
  });

  it("renders branch name", () => {
    render(<AgentCard {...defaultProps} />);
    expect(screen.getByText("feat/issue-42-feature-x")).toBeInTheDocument();
  });

  it("renders time elapsed", () => {
    render(<AgentCard {...defaultProps} />);
    expect(screen.getByText("3m 12s")).toBeInTheDocument();
  });

  it("renders PR link when prUrl is provided", () => {
    render(
      <AgentCard {...defaultProps} prUrl="https://github.com/org/repo/pull/1" />
    );
    const link = screen.getByRole("link", { name: "View PR" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/org/repo/pull/1"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not render PR link when prUrl is not provided", () => {
    render(<AgentCard {...defaultProps} />);
    expect(screen.queryByRole("link", { name: "View PR" })).toBeNull();
  });

  describe("kill button", () => {
    it("renders kill button", () => {
      render(<AgentCard {...defaultProps} />);
      expect(screen.getByTestId("kill-button")).toBeInTheDocument();
    });

    it("shows confirmation dialog when kill button is clicked", () => {
      render(<AgentCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId("kill-button"));
      expect(screen.getByTestId("kill-confirm-dialog")).toBeInTheDocument();
    });

    it("hides confirmation dialog when cancel is clicked", () => {
      render(<AgentCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId("kill-button"));
      fireEvent.click(screen.getByTestId("kill-cancel-button"));
      expect(screen.queryByTestId("kill-confirm-dialog")).toBeNull();
    });

    it("calls fetch and onKilled on successful kill", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, sessionName: "agent-42" }),
      });
      const onKilled = vi.fn();
      render(<AgentCard {...defaultProps} onKilled={onKilled} />);
      fireEvent.click(screen.getByTestId("kill-button"));
      fireEvent.click(screen.getByTestId("kill-confirm-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/sessions/agent-42/kill",
          { method: "POST" }
        );
        expect(onKilled).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onKilled when kill returns error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      const onKilled = vi.fn();
      render(<AgentCard {...defaultProps} onKilled={onKilled} />);
      fireEvent.click(screen.getByTestId("kill-button"));
      fireEvent.click(screen.getByTestId("kill-confirm-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      expect(onKilled).not.toHaveBeenCalled();
    });
  });

  describe("status badge variants", () => {
    const statusVariants: {
      status: AgentStatus;
      label: string;
      colorClass: string;
    }[] = [
      { status: "working", label: "Working", colorClass: "text-blue-400" },
      { status: "pr_open", label: "PR Open", colorClass: "text-yellow-400" },
      {
        status: "review_pending",
        label: "Review Pending",
        colorClass: "text-orange-400",
      },
      { status: "approved", label: "Approved", colorClass: "text-green-400" },
      { status: "merged", label: "Merged", colorClass: "text-purple-400" },
      { status: "error", label: "Error", colorClass: "text-red-400" },
    ];

    statusVariants.forEach(({ status, label, colorClass }) => {
      it(`renders "${label}" badge for status "${status}"`, () => {
        render(<AgentCard {...defaultProps} status={status} />);
        const badge = screen.getByTestId("status-badge");
        expect(badge).toHaveTextContent(label);
        expect(badge.className).toContain(colorClass);
      });
    });
  });
});
