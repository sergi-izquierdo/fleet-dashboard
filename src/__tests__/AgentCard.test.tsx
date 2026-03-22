import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { AgentCard, AgentStatus } from "@/components/AgentCard";

const defaultProps = {
  agentName: "agent-42",
  status: "working" as AgentStatus,
  issueTitle: "Implement feature X",
  branchName: "feat/issue-42-feature-x",
  timeElapsed: "3m 12s",
};

describe("AgentCard", () => {
  afterEach(() => {
    cleanup();
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
