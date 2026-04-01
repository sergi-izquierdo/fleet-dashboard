import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { AgentLogViewer } from "@/components/AgentLogViewer";

describe("AgentLogViewer", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a toggle button labelled 'View Logs'", () => {
    render(<AgentLogViewer sessionName="agent-test-1" />);
    expect(screen.getByTestId("agent-log-viewer-toggle")).toBeDefined();
    expect(screen.getByText("View Logs")).toBeDefined();
  });

  it("does not show log content when collapsed", () => {
    render(<AgentLogViewer sessionName="agent-test-1" />);
    expect(screen.queryByTestId("agent-log-viewer-content")).toBeNull();
  });

  it("expands and fetches logs on toggle click", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionName: "agent-test-1",
        lines: ["line one", "line two"],
      }),
    });

    render(<AgentLogViewer sessionName="agent-test-1" />);
    fireEvent.click(screen.getByTestId("agent-log-viewer-toggle"));

    expect(screen.getByTestId("agent-log-viewer-content")).toBeDefined();

    await waitFor(() => {
      const pre = screen.getByTestId("agent-log-viewer-pre");
      expect(pre).toBeDefined();
      expect(pre.textContent).toContain("line one");
      expect(pre.textContent).toContain("line two");
    });
  });

  it("shows error message when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ sessionName: "agent-err-1", lines: [], error: "Session not found" }),
    });

    render(<AgentLogViewer sessionName="agent-err-1" />);
    fireEvent.click(screen.getByTestId("agent-log-viewer-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("agent-log-viewer-error")).toBeDefined();
      expect(screen.getByText("Session not found")).toBeDefined();
    });
  });

  it("shows network error on fetch exception", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    render(<AgentLogViewer sessionName="agent-net-1" />);
    fireEvent.click(screen.getByTestId("agent-log-viewer-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("agent-log-viewer-error")).toBeDefined();
      expect(screen.getByText("Network error")).toBeDefined();
    });
  });

  it("shows '(no output)' for empty lines", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionName: "agent-empty-1", lines: [] }),
    });

    render(<AgentLogViewer sessionName="agent-empty-1" />);
    fireEvent.click(screen.getByTestId("agent-log-viewer-toggle"));

    await waitFor(() => {
      expect(screen.getByText("(no output)")).toBeDefined();
    });
  });

  it("re-fetches logs when refresh button is clicked", async () => {
    const mockFetch = (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionName: "agent-refresh-1", lines: ["initial"] }),
    });

    render(<AgentLogViewer sessionName="agent-refresh-1" />);
    fireEvent.click(screen.getByTestId("agent-log-viewer-toggle"));

    await waitFor(() => {
      expect(screen.getByText("initial")).toBeDefined();
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sessionName: "agent-refresh-1", lines: ["updated"] }),
    });

    fireEvent.click(screen.getByTestId("agent-log-viewer-refresh"));

    await waitFor(() => {
      expect(screen.getByText("updated")).toBeDefined();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("collapses on second toggle click", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionName: "agent-collapse-1", lines: [] }),
    });

    render(<AgentLogViewer sessionName="agent-collapse-1" />);
    const toggle = screen.getByTestId("agent-log-viewer-toggle");

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.getByTestId("agent-log-viewer-content")).toBeDefined();
    });

    fireEvent.click(toggle);
    expect(screen.queryByTestId("agent-log-viewer-content")).toBeNull();
  });

  it("calls fetch with encoded session name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionName: "agent-abc-1", lines: [] }),
    });

    render(<AgentLogViewer sessionName="agent-abc-1" />);
    fireEvent.click(screen.getByTestId("agent-log-viewer-toggle"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/sessions/agent-abc-1/logs");
    });
  });
});
