import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { AgentLifecycleTimeline } from "@/components/AgentLifecycleTimeline";
import type { Agent } from "@/types/dashboard";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    name: "agent-42",
    sessionId: "agent-42",
    status: "working",
    issue: { title: "Feature X", number: 42, url: "" },
    branch: "feat/issue-42",
    timeElapsed: "2m 5s",
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("AgentLifecycleTimeline", () => {
  it("renders the timeline container", () => {
    render(<AgentLifecycleTimeline agent={makeAgent()} />);
    expect(
      screen.getByTestId("agent-lifecycle-timeline")
    ).toBeInTheDocument();
  });

  it("renders all 8 expected steps", () => {
    render(
      <AgentLifecycleTimeline
        agent={makeAgent({ lifecycleTimestamps: { spawned: "2024-01-01T10:00:00Z" } })}
      />
    );
    const expectedSteps = [
      "spawned",
      "working",
      "committed",
      "prCreated",
      "ciRunning",
      "ciResult",
      "review",
      "merged",
    ];
    for (const step of expectedSteps) {
      expect(screen.getByTestId(`timeline-step-${step}`)).toBeInTheDocument();
    }
  });

  it("marks spawned as completed and working as current for status=working", () => {
    render(
      <AgentLifecycleTimeline
        agent={makeAgent({ status: "working", lifecycleTimestamps: { spawned: "2024-01-01T10:00:00Z" } })}
      />
    );
    const spawned = screen.getByTestId("step-label-spawned");
    expect(spawned).toHaveClass("text-gray-900");

    const working = screen.getByTestId("step-label-working");
    expect(working).toHaveClass("text-blue-600");
  });

  it("marks steps up to PR Created as completed for status=pr_open", () => {
    render(<AgentLifecycleTimeline agent={makeAgent({ status: "pr_open" })} />);
    for (const step of ["spawned", "working", "committed", "prCreated"]) {
      const label = screen.getByTestId(`step-label-${step}`);
      expect(label).toHaveClass("text-gray-900");
    }
  });

  it("marks all steps as completed for status=merged", () => {
    render(
      <AgentLifecycleTimeline agent={makeAgent({ status: "merged" })} />
    );
    for (const step of [
      "spawned",
      "working",
      "committed",
      "prCreated",
      "ciResult",
      "review",
      "merged",
    ]) {
      const label = screen.getByTestId(`step-label-${step}`);
      expect(label).toHaveClass("text-gray-900");
    }
  });

  it("shows failed label in red when status=error", () => {
    render(<AgentLifecycleTimeline agent={makeAgent({ status: "error" })} />);
    // At least one step should be red (failed)
    const allLabels = screen.getAllByTestId(/^step-label-/);
    const hasRed = allLabels.some((el) =>
      el.classList.contains("text-red-600")
    );
    expect(hasRed).toBe(true);
  });

  it("shows timestamps when lifecycleTimestamps are provided", () => {
    const agent = makeAgent({
      status: "pr_open",
      lifecycleTimestamps: {
        spawned: "2024-01-01T10:00:00Z",
        working: "2024-01-01T10:01:00Z",
        committed: "2024-01-01T10:05:00Z",
        prCreated: "2024-01-01T10:06:00Z",
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    expect(screen.getByTestId("step-timestamp-spawned")).toBeInTheDocument();
    expect(screen.getByTestId("step-timestamp-working")).toBeInTheDocument();
  });

  it("shows duration between steps", () => {
    const agent = makeAgent({
      status: "working",
      lifecycleTimestamps: {
        spawned: "2024-01-01T10:00:00Z",
        working: "2024-01-01T10:01:30Z",
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    const duration = screen.getByTestId("step-duration-working");
    expect(duration).toHaveTextContent("+1m 30s");
  });

  it("shows error info on failed step when error is provided", () => {
    const agent = makeAgent({
      status: "error",
      lifecycleTimestamps: {
        spawned: "2024-01-01T10:00:00Z",
        error: "Build failed: missing dependency",
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    // The error info should appear somewhere in the document
    expect(screen.getByText("Build failed: missing dependency")).toBeInTheDocument();
  });

  it("shows CI fix sub-steps when ciFixAttempts are provided", () => {
    const agent = makeAgent({
      status: "review_pending",
      lifecycleTimestamps: {
        spawned: "2024-01-01T10:00:00Z",
        prCreated: "2024-01-01T10:05:00Z",
        ciFailed: "2024-01-01T10:07:00Z",
        ciPassed: "2024-01-01T10:10:00Z",
        ciFixAttempts: [
          {
            startedAt: "2024-01-01T10:07:30Z",
            completedAt: "2024-01-01T10:09:00Z",
          },
        ],
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    expect(
      screen.getByTestId("timeline-substep-ci-fix-0")
    ).toBeInTheDocument();
  });

  it("shows review fix sub-steps when reviewFixAttempts are provided", () => {
    const agent = makeAgent({
      status: "approved",
      lifecycleTimestamps: {
        spawned: "2024-01-01T10:00:00Z",
        prCreated: "2024-01-01T10:05:00Z",
        ciPassed: "2024-01-01T10:08:00Z",
        reviewStarted: "2024-01-01T10:10:00Z",
        reviewChangesRequested: "2024-01-01T10:15:00Z",
        reviewFixAttempts: [
          {
            startedAt: "2024-01-01T10:15:00Z",
            completedAt: "2024-01-01T10:20:00Z",
          },
        ],
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    expect(
      screen.getByTestId("timeline-substep-review-fix-0")
    ).toBeInTheDocument();
  });

  it("renders CI Passed label when CI passes", () => {
    const agent = makeAgent({
      status: "review_pending",
      lifecycleTimestamps: {
        ciPassed: "2024-01-01T10:08:00Z",
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    expect(screen.getByTestId("step-label-ciResult")).toHaveTextContent(
      "CI Passed"
    );
  });

  it("renders CI Failed label when CI fails", () => {
    const agent = makeAgent({
      status: "pr_open",
      lifecycleTimestamps: {
        ciFailed: "2024-01-01T10:08:00Z",
      },
    });
    render(<AgentLifecycleTimeline agent={agent} />);
    expect(screen.getByTestId("step-label-ciResult")).toHaveTextContent(
      "CI Failed"
    );
  });

  it("renders without lifecycleTimestamps (graceful fallback)", () => {
    render(
      <AgentLifecycleTimeline
        agent={makeAgent({ status: "merged", lifecycleTimestamps: undefined })}
      />
    );
    expect(
      screen.getByTestId("agent-lifecycle-timeline")
    ).toBeInTheDocument();
  });
});
