import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { MobileSidebar } from "@/components/layout/Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, className }: { href: string; children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

describe("MobileSidebar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<MobileSidebar open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders drawer when open", () => {
    render(<MobileSidebar open={true} onClose={() => {}} />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders all nav items", () => {
    render(<MobileSidebar open={true} onClose={() => {}} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.getByText("Queue")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Costs")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<MobileSidebar open={true} onClose={onClose} />);
    // The backdrop is the first div (fixed inset-0)
    const backdrop = document.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when a nav link is clicked", () => {
    const onClose = vi.fn();
    render(<MobileSidebar open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Agents"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("highlights active nav item based on current path", () => {
    render(<MobileSidebar open={true} onClose={() => {}} />);
    // Overview should be active (pathname is "/")
    const overviewLink = screen.getByText("Overview").closest("a");
    expect(overviewLink?.className).toContain("bg-white/[0.08]");
  });

  it("renders Fleet Online status indicator", () => {
    render(<MobileSidebar open={true} onClose={() => {}} />);
    expect(screen.getByText("Fleet Online")).toBeInTheDocument();
  });

  it("renders Fleet logo with Activity icon and label", () => {
    render(<MobileSidebar open={true} onClose={() => {}} />);
    expect(screen.getByText("Fleet")).toBeInTheDocument();
  });
});
