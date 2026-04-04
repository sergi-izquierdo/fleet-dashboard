import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import IssueQueueTable from "@/components/IssueQueueTable";
import { showToast } from "@/components/Toast";

vi.mock("@/components/Toast", () => ({
  showToast: vi.fn(),
}));

const mockIssues = [
  {
    repo: "sergi-izquierdo/fleet-dashboard",
    number: 42,
    title: "Fix the thing",
    url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/42",
    createdAt: "2026-04-01T10:00:00Z",
    labels: ["bug", "agent-local"],
  },
];

describe("IssueQueueTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders issues fetched from the API", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ issues: mockIssues }),
    } as Response);

    render(<IssueQueueTable />);

    await waitFor(() => {
      expect(screen.getByText("Fix the thing")).toBeInTheDocument();
    });
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("does NOT render an inline toast element", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ issues: mockIssues }),
    } as Response);

    render(<IssueQueueTable />);

    await waitFor(() => {
      expect(screen.getByText("Fix the thing")).toBeInTheDocument();
    });

    // The old inline toast was a fixed div with bg-gray-800 — it should not exist
    const inlineToast = document.querySelector(".fixed.bottom-4.right-4.bg-gray-800");
    expect(inlineToast).toBeNull();
  });

  it("calls global showToast on successful remove", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: mockIssues }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    render(<IssueQueueTable />);

    await waitFor(() => {
      expect(screen.getByText("Fix the thing")).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle(/remove from queue/i);
    await act(async () => {
      await userEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: "success",
        title: "Removed #42 from queue",
      });
    });
  });

  it("calls global showToast with error type on remove failure", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: mockIssues }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: "GitHub API error" }),
      } as Response);

    render(<IssueQueueTable />);

    await waitFor(() => {
      expect(screen.getByText("Fix the thing")).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle(/remove from queue/i);
    await act(async () => {
      await userEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: "error",
        title: "GitHub API error",
      });
    });
  });

  it("calls global showToast on successful boost", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: mockIssues }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    render(<IssueQueueTable />);

    await waitFor(() => {
      expect(screen.getByText("Fix the thing")).toBeInTheDocument();
    });

    const boostButton = screen.getByTitle(/boost priority/i);
    await act(async () => {
      await userEvent.click(boostButton);
    });

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: "success",
        title: "Boosted priority for #42",
      });
    });
  });
});
