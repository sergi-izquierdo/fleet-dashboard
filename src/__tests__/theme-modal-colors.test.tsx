import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { CreateIssueDialog } from "@/components/CreateIssueDialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("KeyboardShortcutsModal theme colors", () => {
  it("does not use hardcoded dark bg-[#12141a] class", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    const modal = screen.getByRole("dialog");
    const inner = modal.querySelector("[class*='bg-\\[#12141a\\]']");
    expect(inner).toBeNull();
  });

  it("uses theme-aware background classes", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    const modal = screen.getByRole("dialog");
    const inner = modal.querySelector("[class*='bg-white']");
    expect(inner).not.toBeNull();
  });
});

describe("CreateIssueDialog theme colors", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ projects: [] }),
    });
  });

  it("does not use non-standard hardcoded dark background classes", () => {
    render(<CreateIssueDialog open={true} onClose={vi.fn()} />);
    const container = document.body;
    // #12141a and #12131a are the old non-standard variants — should not appear
    expect(container.querySelector("[class*='bg-\\[#12141a\\]']")).toBeNull();
    expect(container.querySelector("[class*='bg-\\[#12131a\\]']")).toBeNull();
  });

  it("uses the standardized dark:bg-[#0f1117] modal background", () => {
    render(<CreateIssueDialog open={true} onClose={vi.fn()} />);
    const container = document.body;
    // #0f1117 is the ONE approved dark modal background per issue #313
    const standardModal = container.querySelector("[class*='bg-\\[#0f1117\\]']");
    expect(standardModal).not.toBeNull();
  });

  it("renders the modal with theme-aware background", () => {
    render(<CreateIssueDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const inner = document.body.querySelector("[class*='bg-white']");
    expect(inner).not.toBeNull();
  });
});
