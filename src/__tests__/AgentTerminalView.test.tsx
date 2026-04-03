import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { AgentTerminalView } from "@/components/AgentTerminalView";

const mockTerminalResponse = {
  sessionName: "agent-abc-1",
  lines: ["Hello, world!", "Second line"],
  active: true,
};

const mockEmptyResponse = {
  sessionName: "agent-abc-1",
  lines: [],
  active: false,
  error: 'Session "agent-abc-1" not found',
};

describe("AgentTerminalView", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    // EventSource is stubbed in setup.ts
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading skeleton initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    expect(screen.getByTestId("terminal-loading")).toBeTruthy();
  });

  it("displays terminal output after loading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("terminal-output")).toBeTruthy();
    });
    expect(screen.getByText("Hello, world!")).toBeTruthy();
    expect(screen.getByText("Second line")).toBeTruthy();
  });

  it("shows empty state when session not found", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => mockEmptyResponse,
    });
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("terminal-empty")).toBeTruthy();
    });
  });

  it("renders header with session name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    render(
      <AgentTerminalView
        sessionName="agent-abc-1"
        agentStatus="working"
        timeElapsed="5m 30s"
      />
    );
    expect(screen.getByText("agent-abc-1")).toBeTruthy();
    expect(screen.getByText("working")).toBeTruthy();
    expect(screen.getByText("5m 30s")).toBeTruthy();
  });

  it("shows connection status indicator", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    expect(screen.getByTestId("connection-status")).toBeTruthy();
  });

  it("has refresh and copy buttons", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    expect(screen.getByTestId("refresh-terminal-button")).toBeTruthy();
    expect(screen.getByTestId("copy-terminal-button")).toBeTruthy();
  });

  it("has auto-refresh toggle defaulting to on", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    const toggle = screen.getByTestId("auto-refresh-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it("can disable auto-refresh", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    const toggle = screen.getByTestId("auto-refresh-toggle") as HTMLInputElement;
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
  });

  it("triggers manual refresh on button click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTerminalResponse,
    });
    global.fetch = fetchMock;
    render(<AgentTerminalView sessionName="agent-abc-1" />);
    await waitFor(() => screen.getByTestId("terminal-output"));

    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByTestId("refresh-terminal-button"));
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
