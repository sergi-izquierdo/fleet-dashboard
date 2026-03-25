import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { NotificationHistoryPanel } from "@/components/NotificationHistoryPanel";
import type { ActivityEvent } from "@/types/dashboard";

const makeEvent = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: "evt-1",
  timestamp: new Date(Date.now() - 60_000).toISOString(),
  agentName: "agent-alpha",
  eventType: "commit",
  description: "feat: add new feature",
  ...overrides,
});

describe("NotificationHistoryPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no events", () => {
    render(<NotificationHistoryPanel activityLog={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders events from activity log", () => {
    const events: ActivityEvent[] = [
      makeEvent({ id: "1", agentName: "agent-alpha", eventType: "commit" }),
      makeEvent({ id: "2", agentName: "agent-beta", eventType: "ci_failed" }),
    ];
    render(<NotificationHistoryPanel activityLog={events} />);
    expect(screen.getByTestId("history-event-list")).toBeInTheDocument();
    expect(screen.getByTestId("history-event-1")).toBeInTheDocument();
    expect(screen.getByTestId("history-event-2")).toBeInTheDocument();
  });

  it("shows agent name and event type badge", () => {
    const events: ActivityEvent[] = [
      makeEvent({ id: "1", agentName: "agent-alpha", eventType: "pr_created" }),
    ];
    render(<NotificationHistoryPanel activityLog={events} />);
    expect(screen.getByText("agent-alpha")).toBeInTheDocument();
    expect(screen.getByText("PR Created")).toBeInTheDocument();
  });

  it("shows emoji for each event type", () => {
    const eventTypes: ActivityEvent["eventType"][] = [
      "commit",
      "pr_created",
      "ci_failed",
      "ci_passed",
      "review",
      "deploy",
      "error",
    ];
    const events = eventTypes.map((eventType, i) =>
      makeEvent({ id: String(i), eventType })
    );
    render(<NotificationHistoryPanel activityLog={events} />);
    expect(screen.getByTestId("history-event-list").children.length).toBe(
      eventTypes.length
    );
  });

  it("limits display to last 20 events", () => {
    const events: ActivityEvent[] = Array.from({ length: 25 }, (_, i) =>
      makeEvent({
        id: String(i),
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      })
    );
    render(<NotificationHistoryPanel activityLog={events} />);
    const list = screen.getByTestId("history-event-list");
    expect(list.children.length).toBe(20);
  });

  it("sorts events newest first", () => {
    const now = Date.now();
    const events: ActivityEvent[] = [
      makeEvent({
        id: "old",
        agentName: "old-agent",
        timestamp: new Date(now - 3600_000).toISOString(),
      }),
      makeEvent({
        id: "new",
        agentName: "new-agent",
        timestamp: new Date(now - 60_000).toISOString(),
      }),
    ];
    render(<NotificationHistoryPanel activityLog={events} />);
    const list = screen.getByTestId("history-event-list");
    const firstItem = list.firstElementChild;
    expect(firstItem).toHaveAttribute("data-testid", "history-event-new");
  });

  it("shows mark all read button when unread events exist", () => {
    const events: ActivityEvent[] = [makeEvent({ id: "1" })];
    render(<NotificationHistoryPanel activityLog={events} />);
    expect(screen.getByTestId("history-mark-all-read")).toBeInTheDocument();
  });

  it("hides mark all read button when no events", () => {
    render(<NotificationHistoryPanel activityLog={[]} />);
    expect(
      screen.queryByTestId("history-mark-all-read")
    ).not.toBeInTheDocument();
  });

  it("marks all events as read when clicking mark all read", () => {
    const events: ActivityEvent[] = [
      makeEvent({ id: "1" }),
      makeEvent({ id: "2" }),
    ];
    render(<NotificationHistoryPanel activityLog={events} />);
    expect(screen.getByTestId("history-mark-all-read")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("history-mark-all-read"));

    expect(
      screen.queryByTestId("history-mark-all-read")
    ).not.toBeInTheDocument();
  });

  it("shows event description", () => {
    const events: ActivityEvent[] = [
      makeEvent({ id: "1", description: "feat: dark mode toggle" }),
    ];
    render(<NotificationHistoryPanel activityLog={events} />);
    expect(screen.getByText("feat: dark mode toggle")).toBeInTheDocument();
  });
});
