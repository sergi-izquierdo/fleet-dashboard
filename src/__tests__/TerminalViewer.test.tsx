import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import TerminalViewer from "@/components/TerminalViewer";

const mockTerminalResponse = {
  sessionName: "agent-1",
  output: "$ npm test\nPASSED all tests\nerror: something failed\nwarning: deprecated\n```js\nconsole.log('hello');\n```\n",
};

function mockFetchSuccess(data = mockTerminalResponse) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        sessionName: "agent-1",
        output: "",
        error: "Session \"agent-1\" not found",
      }),
  });
}

describe("TerminalViewer", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.style.overflow = "";
  });

  it("renders with session name in header", async () => {
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    expect(screen.getByTestId("terminal-session-name")).toHaveTextContent(
      "agent-1"
    );
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    expect(
      screen.getByText("Loading terminal output...")
    ).toBeInTheDocument();
  });

  it("renders terminal output after fetch", async () => {
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("terminal-output")).toBeInTheDocument();
    });

    expect(screen.getByText(/npm test/)).toBeInTheDocument();
  });

  it("shows error state when fetch returns error", async () => {
    mockFetchError();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("terminal-error")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", async () => {
    mockFetchSuccess();
    const onClose = vi.fn();
    render(<TerminalViewer sessionName="agent-1" onClose={onClose} />);

    fireEvent.click(screen.getByTestId("terminal-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", async () => {
    mockFetchSuccess();
    const onClose = vi.fn();
    render(<TerminalViewer sessionName="agent-1" onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("toggles scroll lock button", async () => {
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("scroll-lock-toggle")).toBeInTheDocument();
    });

    const toggle = screen.getByTestId("scroll-lock-toggle");
    expect(toggle).toHaveTextContent("Auto-scroll");

    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Scroll locked");

    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Auto-scroll");
  });

  it("prevents body scroll when open", () => {
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll on unmount", () => {
    mockFetchSuccess();
    const { unmount } = render(
      <TerminalViewer sessionName="agent-1" onClose={vi.fn()} />
    );
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("applies syntax highlighting to error lines", async () => {
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("terminal-output")).toBeInTheDocument();
    });

    const output = screen.getByTestId("terminal-output");
    const errorSpan = output.querySelector(".text-red-400");
    expect(errorSpan).not.toBeNull();
  });

  it("encodes session name in API URL", async () => {
    mockFetchSuccess();
    render(
      <TerminalViewer sessionName="agent with spaces" onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/sessions/agent%20with%20spaces/terminal"
      );
    });
  });

  it("sets up auto-refresh interval", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
  });

  it("has fullscreen dialog role", () => {
    mockFetchSuccess();
    render(<TerminalViewer sessionName="agent-1" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
