import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { HealthTimelineModal } from "@/components/HealthTimelineModal";
import type { HealthTimelineEntry } from "@/types/dashboard";

const mockTimeline: HealthTimelineEntry[] = [
  { timestamp: "2026-03-23T08:00:00Z", status: "working" },
  { timestamp: "2026-03-23T08:30:00Z", status: "idle" },
  { timestamp: "2026-03-23T09:00:00Z", status: "error" },
  { timestamp: "2026-03-23T09:30:00Z", status: "working" },
];

describe("HealthTimelineModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders modal with agent name", () => {
    render(
      <HealthTimelineModal
        agentName="agent-alpha"
        timeline={mockTimeline}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("agent-alpha — Health Timeline (24h)"),
    ).toBeInTheDocument();
  });

  it("shows status counts in legend", () => {
    render(
      <HealthTimelineModal
        agentName="agent-alpha"
        timeline={mockTimeline}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Working:")).toBeInTheDocument();
    expect(screen.getByText("Idle:")).toBeInTheDocument();
    expect(screen.getByText("Error:")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <HealthTimelineModal
        agentName="agent-alpha"
        timeline={mockTimeline}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Close timeline"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <HealthTimelineModal
        agentName="agent-alpha"
        timeline={mockTimeline}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("health-timeline-modal"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <HealthTimelineModal
        agentName="agent-alpha"
        timeline={mockTimeline}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
