"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { CommandPalette, buildCommandItems } from "@/components/CommandPalette";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <ThemeToggle />
            <NotificationCenter activityLog={[]} />
            <ConnectionIndicator status="connected" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
