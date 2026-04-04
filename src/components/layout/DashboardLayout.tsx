"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { CommandPalette, buildCommandItems } from "@/components/CommandPalette";
import { CreateIssueDialog } from "@/components/CreateIssueDialog";
import { ToastContainer } from "@/components/Toast";
import { FleetNotifications } from "@/components/FleetNotifications";
import { DispatcherToggle } from "@/components/DispatcherToggle";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition: Transition = {
  duration: 0.15,
  ease: "easeOut",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  const handleCloseModal = useCallback(() => {
    setCreateIssueOpen(false);
    setShortcutsHelpOpen(false);
  }, []);

  useKeyboardShortcuts({
    onCreateIssue: () => setCreateIssueOpen(true),
    onShowHelp: () => setShortcutsHelpOpen(true),
    onCloseModal: handleCloseModal,
  });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0a0b0f] text-gray-900 dark:text-white">
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
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0a0b0f]/80 px-4 backdrop-blur-md">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/60 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <DispatcherToggle />
            <button
              onClick={() => setCreateIssueOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 dark:border-white/[0.08] bg-transparent dark:bg-white/[0.04] px-2.5 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white/80 transition-colors"
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
        <main className="overflow-x-hidden p-4 lg:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{ willChange: "transform, opacity" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CreateIssueDialog
        open={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
      />
      <KeyboardShortcutsModal
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
      <FleetNotifications />
      <ToastContainer />
    </div>
  );
}
