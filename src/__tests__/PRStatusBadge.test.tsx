import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import {
  PRStatusBadge,
  CIStatus,
  ReviewStatus,
  MergeState,
} from "@/components/PRStatusBadge";

const defaultProps = {
  prNumber: 42,
  repoUrl: "https://github.com/org/repo",
  ciStatus: "passing" as CIStatus,
  reviewStatus: "approved" as ReviewStatus,
  mergeState: "open" as MergeState,
};

describe("PRStatusBadge", () => {
  afterEach(cleanup);

  it("renders the PR number as a link to the correct URL", () => {
    render(<PRStatusBadge {...defaultProps} />);
    const link = screen.getByRole("link", { name: "#42" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/org/repo/pull/42"
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  describe("CI status", () => {
    it.each<[CIStatus, string]>([
      ["passing", "CI Passing"],
      ["failing", "CI Failing"],
      ["pending", "CI Pending"],
    ])("displays %s status as '%s'", (status, label) => {
      render(<PRStatusBadge {...defaultProps} ciStatus={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("applies green styling for passing CI", () => {
      render(<PRStatusBadge {...defaultProps} ciStatus="passing" />);
      const el = screen.getByText("CI Passing");
      expect(el.className).toContain("text-green-400");
    });

    it("applies red styling for failing CI", () => {
      render(<PRStatusBadge {...defaultProps} ciStatus="failing" />);
      const el = screen.getByText("CI Failing");
      expect(el.className).toContain("text-red-400");
    });

    it("applies yellow styling for pending CI", () => {
      render(<PRStatusBadge {...defaultProps} ciStatus="pending" />);
      const el = screen.getByText("CI Pending");
      expect(el.className).toContain("text-yellow-400");
    });
  });

  describe("Review status", () => {
    it.each<[ReviewStatus, string]>([
      ["approved", "Approved"],
      ["changes_requested", "Changes Requested"],
      ["pending", "Review Pending"],
    ])("displays %s review status as '%s'", (status, label) => {
      render(<PRStatusBadge {...defaultProps} reviewStatus={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("applies green styling for approved review", () => {
      render(<PRStatusBadge {...defaultProps} reviewStatus="approved" />);
      const el = screen.getByText("Approved");
      expect(el.className).toContain("text-green-400");
    });

    it("applies red styling for changes_requested review", () => {
      render(
        <PRStatusBadge {...defaultProps} reviewStatus="changes_requested" />
      );
      const el = screen.getByText("Changes Requested");
      expect(el.className).toContain("text-red-400");
    });

    it("applies yellow styling for pending review", () => {
      render(<PRStatusBadge {...defaultProps} reviewStatus="pending" />);
      const el = screen.getByText("Review Pending");
      expect(el.className).toContain("text-yellow-400");
    });
  });

  describe("Merge state", () => {
    it.each<[MergeState, string]>([
      ["merged", "Merged"],
      ["open", "Open"],
      ["closed", "Closed"],
    ])("displays %s merge state as '%s'", (state, label) => {
      render(<PRStatusBadge {...defaultProps} mergeState={state} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("applies purple styling for merged state", () => {
      render(<PRStatusBadge {...defaultProps} mergeState="merged" />);
      const el = screen.getByText("Merged");
      expect(el.className).toContain("text-purple-400");
    });

    it("applies green styling for open state", () => {
      render(<PRStatusBadge {...defaultProps} mergeState="open" />);
      const el = screen.getByText("Open");
      expect(el.className).toContain("text-green-400");
    });

    it("applies red styling for closed state", () => {
      render(<PRStatusBadge {...defaultProps} mergeState="closed" />);
      const el = screen.getByText("Closed");
      expect(el.className).toContain("text-red-400");
    });
  });

  describe("status combinations", () => {
    it("renders failing CI with changes requested and open", () => {
      render(
        <PRStatusBadge
          prNumber={99}
          repoUrl="https://github.com/org/repo"
          ciStatus="failing"
          reviewStatus="changes_requested"
          mergeState="open"
        />
      );
      expect(screen.getByRole("link", { name: "#99" })).toBeInTheDocument();
      expect(screen.getByText("CI Failing")).toBeInTheDocument();
      expect(screen.getByText("Changes Requested")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("renders passing CI with approved and merged", () => {
      render(
        <PRStatusBadge
          prNumber={100}
          repoUrl="https://github.com/org/repo"
          ciStatus="passing"
          reviewStatus="approved"
          mergeState="merged"
        />
      );
      expect(screen.getByRole("link", { name: "#100" })).toBeInTheDocument();
      expect(screen.getByText("CI Passing")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Merged")).toBeInTheDocument();
    });

    it("renders pending CI with pending review and closed", () => {
      render(
        <PRStatusBadge
          prNumber={7}
          repoUrl="https://github.com/org/repo"
          ciStatus="pending"
          reviewStatus="pending"
          mergeState="closed"
        />
      );
      expect(screen.getByRole("link", { name: "#7" })).toBeInTheDocument();
      expect(screen.getByText("CI Pending")).toBeInTheDocument();
      expect(screen.getByText("Review Pending")).toBeInTheDocument();
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });
  });
});
