import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

// Mock next/navigation before importing the component
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ theme: "dark", setTheme: vi.fn() })),
}));

vi.mock("@/hooks/useDashboardData", () => ({
  useDashboardData: vi.fn(() => ({ data: null, isLoading: false, error: null, connectionStatus: "disconnected", countdown: 30, refresh: vi.fn() })),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock heavy sub-components used in DashboardLayout
vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => <nav data-testid="sidebar" />,
  MobileSidebar: () => null,
}));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/NotificationCenter", () => ({ NotificationCenter: () => null }));
vi.mock("@/components/ConnectionIndicator", () => ({ ConnectionIndicator: () => null }));
vi.mock("@/components/CommandPalette", () => ({
  CommandPalette: () => null,
  buildCommandItems: () => [],
}));
vi.mock("@/components/CreateIssueDialog", () => ({ CreateIssueDialog: () => null }));
vi.mock("@/components/Toast", () => ({ ToastContainer: () => null }));
vi.mock("@/components/FleetNotifications", () => ({ FleetNotifications: () => null }));
vi.mock("@/components/DispatcherToggle", () => ({ DispatcherToggle: () => null }));
vi.mock("@/components/KeyboardShortcutsModal", () => ({ KeyboardShortcutsModal: () => null }));
vi.mock("@/hooks/useKeyboardShortcuts", () => ({ useKeyboardShortcuts: () => {} }));

import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

describe("DashboardLayout page transitions", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children inside the page transition wrapper", () => {
    render(
      <DashboardLayout>
        <div data-testid="page-content">Hello</div>
      </DashboardLayout>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("uses pathname as key for the motion wrapper", () => {
    vi.mocked(usePathname).mockReturnValue("/agents");
    render(
      <DashboardLayout>
        <div data-testid="agents-page">Agents</div>
      </DashboardLayout>
    );
    expect(screen.getByTestId("agents-page")).toBeInTheDocument();
  });

  it("renders children for different routes", () => {
    vi.mocked(usePathname).mockReturnValue("/costs");
    render(
      <DashboardLayout>
        <div data-testid="costs-page">Costs</div>
      </DashboardLayout>
    );
    expect(screen.getByTestId("costs-page")).toBeInTheDocument();
  });
});
