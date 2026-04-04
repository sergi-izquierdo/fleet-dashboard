import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { getPageTitle } from "@/components/layout/DashboardLayout";
import { Sidebar } from "@/components/layout/Sidebar";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mutable pathname for tests
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("getPageTitle", () => {
  it("returns Overview for /", () => {
    expect(getPageTitle("/")).toBe("Overview");
  });

  it("returns Agents for /agents", () => {
    expect(getPageTitle("/agents")).toBe("Agents");
  });

  it("returns Pull Requests for /prs", () => {
    expect(getPageTitle("/prs")).toBe("Pull Requests");
  });

  it("returns Queue for /queue", () => {
    expect(getPageTitle("/queue")).toBe("Queue");
  });

  it("returns Services for /services", () => {
    expect(getPageTitle("/services")).toBe("Services");
  });

  it("returns Costs for /costs", () => {
    expect(getPageTitle("/costs")).toBe("Costs");
  });

  it("returns Reports for /reports", () => {
    expect(getPageTitle("/reports")).toBe("Reports");
  });

  it("returns Settings for /settings", () => {
    expect(getPageTitle("/settings")).toBe("Settings");
  });

  it("returns title for nested route under a known prefix", () => {
    expect(getPageTitle("/agents/123")).toBe("Agents");
    expect(getPageTitle("/prs/456")).toBe("Pull Requests");
  });

  it("returns Dashboard for unknown routes", () => {
    expect(getPageTitle("/unknown")).toBe("Dashboard");
    expect(getPageTitle("/some/deep/path")).toBe("Dashboard");
  });

  it("does not treat / as a prefix for /prs", () => {
    // / is exact match only, should not prefix-match /prs
    expect(getPageTitle("/prs")).toBe("Pull Requests");
  });
});

describe("Sidebar active nav highlight", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockPathname = "/";
  });

  it("highlights Overview when on /", () => {
    mockPathname = "/";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    const overviewLink = screen.getByText("Overview").closest("a");
    expect(overviewLink?.className).toContain("bg-blue-50");
  });

  it("highlights Agents when on /agents", () => {
    mockPathname = "/agents";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    const agentsLink = screen.getByText("Agents").closest("a");
    expect(agentsLink?.className).toContain("bg-blue-50");
  });

  it("highlights Pull Requests when on /prs", () => {
    mockPathname = "/prs";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    const prsLink = screen.getByText("Pull Requests").closest("a");
    expect(prsLink?.className).toContain("bg-blue-50");
  });

  it("does not highlight Overview when on /agents", () => {
    mockPathname = "/agents";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    const overviewLink = screen.getByText("Overview").closest("a");
    expect(overviewLink?.className).not.toContain("bg-blue-50");
  });

  it("highlights active link for nested route", () => {
    mockPathname = "/agents/detail/123";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    const agentsLink = screen.getByText("Agents").closest("a");
    expect(agentsLink?.className).toContain("bg-blue-50");
  });

  it("renders active indicator bar for active link", () => {
    mockPathname = "/";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    // The active indicator has a specific class
    const indicator = document.querySelector(".bg-blue-500.rounded-full");
    expect(indicator).not.toBeNull();
  });

  it("hides labels when collapsed", () => {
    mockPathname = "/";
    render(<Sidebar collapsed={true} onToggle={() => {}} />);
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Agents")).not.toBeInTheDocument();
  });

  it("shows labels when not collapsed", () => {
    mockPathname = "/";
    render(<Sidebar collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });
});
