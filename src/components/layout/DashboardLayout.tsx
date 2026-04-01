"use client";

import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { CommandPalette, buildCommandItems } from "@/components/CommandPalette";
import { CreateIssueDialog } from "@/components/CreateIssueDialog";
import { ToastContainer } from "@/components/Toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0a0b0f] text-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div
        className={`flex-1 transition-all duration-200 ${
          sidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-[220px]"
        }`}
      >
        {/* Top bar — mobile hamburger + quick actions */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/[0.06] bg-[#0a0b0f]/80 px-4 backdrop-blur-md">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white/60 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateIssueOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-colors"
              aria-label="New Issue"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Issue</span>
            </button>
            <ThemeToggle />
            <NotificationCenter activityLog={[]} />
            <ConnectionIndicator status="connected" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      <CreateIssueDialog
        open={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
      />
      <ToastContainer />
    </div>
  );
}
