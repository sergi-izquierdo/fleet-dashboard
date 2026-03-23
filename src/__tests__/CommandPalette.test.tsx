import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  CommandPalette,
  buildCommandItems,
  type CommandItem,
} from "@/components/CommandPalette";
import type { DashboardData } from "@/types/dashboard";

const mockItems: CommandItem[] = [
  {
    id: "action-refresh",
    label: "Refresh dashboard",
    category: "action",
    shortcut: "R",
    icon: "↻",
    onSelect: vi.fn(),
  },
  {
    id: "action-theme",
    label: "Toggle theme",
    category: "action",
    shortcut: "T",
    icon: "◑",
    onSelect: vi.fn(),
  },
  {
    id: "nav-agents",
    label: "Go to Agents",
    category: "navigation",
    icon: "🤖",
    onSelect: vi.fn(),
  },
  {
    id: "agent-1",
    label: "Agent Alpha — Fix login bug",
    category: "agent",
    icon: "🤖",
    onSelect: vi.fn(),
  },
  {
    id: "pr-42",
    label: "#42 Add dark mode support",
    category: "pr",
    icon: "🟢",
    onSelect: vi.fn(),
  },
];

describe("CommandPalette", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when closed", () => {
    render(<CommandPalette open={false} onClose={onClose} items={mockItems} />);
    expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  });

  it("renders the palette when open", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
  });

  it("shows all items when no query is entered", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    expect(screen.getByText("Refresh dashboard")).toBeInTheDocument();
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
    expect(screen.getByText("Go to Agents")).toBeInTheDocument();
    expect(screen.getByText("Agent Alpha — Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("#42 Add dark mode support")).toBeInTheDocument();
  });

  it("filters items with fuzzy search", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.change(input, { target: { value: "refresh" } });

    expect(screen.getByText("Refresh dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Toggle theme")).not.toBeInTheDocument();
    expect(screen.queryByText("Go to Agents")).not.toBeInTheDocument();
  });

  it("shows no results message when nothing matches", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.change(input, { target: { value: "zzzzzzz" } });

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect and onClose when Enter is pressed on selected item", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems[0].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates items with arrow keys", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    // Move down to second item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems[1].onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const backdrop = screen.getByTestId("command-palette");

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when palette body is clicked", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.click(input);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("displays keyboard shortcuts", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const kbds = screen.getAllByRole("option");
    // Verify shortcuts are rendered within kbd elements
    const refreshItem = screen.getByTestId("command-item-action-refresh");
    expect(refreshItem.querySelector("kbd")?.textContent).toBe("R");
    const themeItem = screen.getByTestId("command-item-action-theme");
    expect(themeItem.querySelector("kbd")?.textContent).toBe("T");
  });
});

describe("buildCommandItems", () => {
  const mockData: DashboardData = {
    agents: [
      {
        name: "Agent-1",
        sessionId: "s1",
        status: "working",
        issue: {
          title: "Fix auth flow",
          number: 10,
          url: "https://github.com/test/repo/issues/10",
        },
        branch: "feat/auth",
        timeElapsed: "2h",
        pr: { url: "https://github.com/test/repo/pull/11", number: 11 },
      },
    ],
    prs: [
      {
        number: 11,
        url: "https://github.com/test/repo/pull/11",
        title: "Fix auth flow",
        ciStatus: "passing",
        reviewStatus: "pending",
        mergeState: "open",
        author: "bot",
        branch: "feat/auth",
      },
    ],
    activityLog: [],
  };

  it("builds static action items", () => {
    const items = buildCommandItems(null, {
      refresh: vi.fn(),
      toggleTheme: vi.fn(),
      scrollToSection: vi.fn(),
    });

    const actionItems = items.filter((i) => i.category === "action");
    expect(actionItems).toHaveLength(2);
    expect(actionItems.map((i) => i.label)).toContain("Refresh dashboard");
    expect(actionItems.map((i) => i.label)).toContain("Toggle theme");
  });

  it("builds navigation items", () => {
    const items = buildCommandItems(null, {
      refresh: vi.fn(),
      toggleTheme: vi.fn(),
      scrollToSection: vi.fn(),
    });

    const navItems = items.filter((i) => i.category === "navigation");
    expect(navItems.length).toBeGreaterThanOrEqual(5);
  });

  it("includes agents from dashboard data", () => {
    const items = buildCommandItems(mockData, {
      refresh: vi.fn(),
      toggleTheme: vi.fn(),
      scrollToSection: vi.fn(),
    });

    const agentItems = items.filter((i) => i.category === "agent");
    expect(agentItems).toHaveLength(1);
    expect(agentItems[0].label).toContain("Agent-1");
    expect(agentItems[0].label).toContain("Fix auth flow");
  });

  it("includes PRs from dashboard data", () => {
    const items = buildCommandItems(mockData, {
      refresh: vi.fn(),
      toggleTheme: vi.fn(),
      scrollToSection: vi.fn(),
    });

    const prItems = items.filter((i) => i.category === "pr");
    expect(prItems).toHaveLength(1);
    expect(prItems[0].label).toContain("#11");
  });
});
