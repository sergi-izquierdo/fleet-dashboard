import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
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
    subtitle: "working",
    category: "agent",
    icon: "🤖",
    onSelect: vi.fn(),
  },
  {
    id: "pr-42",
    label: "#42 Add dark mode support",
    subtitle: "feat/dark-mode",
    category: "pr",
    icon: "🟢",
    onSelect: vi.fn(),
  },
  {
    id: "page-overview",
    label: "Overview",
    category: "page",
    icon: "🏠",
    onSelect: vi.fn(),
  },
];

describe("CommandPalette", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it("shows all items when no query is entered (after debounce)", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(screen.getByText("Refresh dashboard")).toBeInTheDocument();
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
    expect(screen.getByText("Go to Agents")).toBeInTheDocument();
    expect(screen.getByText("Agent Alpha — Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("#42 Add dark mode support")).toBeInTheDocument();
  });

  it("filters items with fuzzy search after debounce", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.change(input, { target: { value: "refresh" } });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.getByText("Refresh dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Toggle theme")).not.toBeInTheDocument();
    expect(screen.queryByText("Go to Agents")).not.toBeInTheDocument();
  });

  it("shows no results message when nothing matches", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.change(input, { target: { value: "zzzzzzz" } });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect and onClose when Enter is pressed on selected item", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    const input = screen.getByTestId("command-palette-input");

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems[0].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates items with arrow keys", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
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

  it("displays keyboard shortcuts", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    const refreshItem = screen.getByTestId("command-item-action-refresh");
    expect(refreshItem.querySelector("kbd")?.textContent).toBe("R");
    const themeItem = screen.getByTestId("command-item-action-theme");
    expect(themeItem.querySelector("kbd")?.textContent).toBe("T");
  });

  it("renders subtitles for items that have them", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(screen.getByText("working")).toBeInTheDocument();
    expect(screen.getByText("feat/dark-mode")).toBeInTheDocument();
  });

  it("shows Pages category header for page items", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(screen.getByText("Pages")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("filters to only action items when query starts with >", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.change(input, { target: { value: ">" } });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.getByText("Refresh dashboard")).toBeInTheDocument();
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
    expect(screen.queryByText("Go to Agents")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent Alpha — Fix login bug")).not.toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("filters actions with text after >", async () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    const input = screen.getByTestId("command-palette-input");

    fireEvent.change(input, { target: { value: "> refresh" } });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.getByText("Refresh dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Toggle theme")).not.toBeInTheDocument();
  });

  it("does not show recent searches when there are none", () => {
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    expect(screen.queryByTestId("recent-searches")).not.toBeInTheDocument();
  });

  it("shows recent searches from localStorage when query is empty", () => {
    localStorage.setItem(
      "fleet-recent-searches",
      JSON.stringify(["agents", "fix bug"]),
    );
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    expect(screen.getByTestId("recent-searches")).toBeInTheDocument();
    expect(screen.getByText("agents")).toBeInTheDocument();
    expect(screen.getByText("fix bug")).toBeInTheDocument();
  });

  it("clears recent searches when Clear is clicked", () => {
    localStorage.setItem(
      "fleet-recent-searches",
      JSON.stringify(["agents"]),
    );
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    expect(screen.getByTestId("recent-searches")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("clear-recent-searches"));
    expect(screen.queryByTestId("recent-searches")).not.toBeInTheDocument();
    expect(localStorage.getItem("fleet-recent-searches")).toBeNull();
  });

  it("hides recent searches when user types a query", () => {
    localStorage.setItem(
      "fleet-recent-searches",
      JSON.stringify(["agents"]),
    );
    render(<CommandPalette open={true} onClose={onClose} items={mockItems} />);
    expect(screen.getByTestId("recent-searches")).toBeInTheDocument();

    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "ref" } });
    expect(screen.queryByTestId("recent-searches")).not.toBeInTheDocument();
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

  const baseActions = {
    refresh: vi.fn(),
    toggleTheme: vi.fn(),
    scrollToSection: vi.fn(),
  };

  it("builds static action items", () => {
    const items = buildCommandItems(null, baseActions);

    const actionItems = items.filter((i) => i.category === "action");
    expect(actionItems.length).toBeGreaterThanOrEqual(2);
    expect(actionItems.map((i) => i.label)).toContain("Refresh dashboard");
    expect(actionItems.map((i) => i.label)).toContain("Toggle theme");
  });

  it("builds navigation items", () => {
    const items = buildCommandItems(null, baseActions);

    const navItems = items.filter((i) => i.category === "navigation");
    expect(navItems.length).toBeGreaterThanOrEqual(5);
  });

  it("includes page navigation items when navigate is provided", () => {
    const navigate = vi.fn();
    const items = buildCommandItems(null, { ...baseActions, navigate });

    const pageItems = items.filter((i) => i.category === "page");
    expect(pageItems.length).toBe(8);
    expect(pageItems.map((i) => i.label)).toContain("Overview");
    expect(pageItems.map((i) => i.label)).toContain("Settings");

    // Selecting Overview calls navigate("/")
    const overview = pageItems.find((i) => i.label === "Overview")!;
    overview.onSelect();
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("does not include page items when navigate is not provided", () => {
    const items = buildCommandItems(null, baseActions);
    const pageItems = items.filter((i) => i.category === "page");
    expect(pageItems).toHaveLength(0);
  });

  it("includes New Issue action when createIssue is provided", () => {
    const createIssue = vi.fn();
    const items = buildCommandItems(null, { ...baseActions, createIssue });

    const newIssue = items.find((i) => i.id === "action-new-issue");
    expect(newIssue).toBeDefined();
    newIssue!.onSelect();
    expect(createIssue).toHaveBeenCalledTimes(1);
  });

  it("includes Pause Dispatcher action when toggleDispatcher is provided", () => {
    const toggleDispatcher = vi.fn();
    const items = buildCommandItems(null, {
      ...baseActions,
      toggleDispatcher,
      dispatcherPaused: false,
    });

    const dispatcher = items.find((i) => i.id === "action-dispatcher");
    expect(dispatcher).toBeDefined();
    expect(dispatcher!.label).toBe("Pause Dispatcher");
    dispatcher!.onSelect();
    expect(toggleDispatcher).toHaveBeenCalledTimes(1);
  });

  it("shows Resume Dispatcher when dispatcher is paused", () => {
    const items = buildCommandItems(null, {
      ...baseActions,
      toggleDispatcher: vi.fn(),
      dispatcherPaused: true,
    });

    const dispatcher = items.find((i) => i.id === "action-dispatcher");
    expect(dispatcher!.label).toBe("Resume Dispatcher");
  });

  it("includes agents from dashboard data with subtitle", () => {
    const items = buildCommandItems(mockData, baseActions);

    const agentItems = items.filter((i) => i.category === "agent");
    expect(agentItems).toHaveLength(1);
    expect(agentItems[0].label).toContain("Agent-1");
    expect(agentItems[0].label).toContain("Fix auth flow");
    expect(agentItems[0].subtitle).toBe("working");
  });

  it("includes PRs from dashboard data with branch as subtitle", () => {
    const items = buildCommandItems(mockData, baseActions);

    const prItems = items.filter((i) => i.category === "pr");
    expect(prItems).toHaveLength(1);
    expect(prItems[0].label).toContain("#11");
    expect(prItems[0].subtitle).toBe("feat/auth");
  });
});
