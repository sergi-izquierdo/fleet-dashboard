"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { CommandPalette, buildCommandItems } from "@/components/CommandPalette";
import { useDashboardData } from "@/hooks/useDashboardData";
import { CreateIssueDialog } from "@/components/CreateIssueDialog";
import { ToastContainer, showToast } from "@/components/Toast";
import { FleetNotifications } from "@/components/FleetNotifications";
import { DispatcherToggle } from "@/components/DispatcherToggle";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SkipLink } from "@/components/SkipLink";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/agents": "Agents",
  "/prs": "Pull Requests",
  "/queue": "Queue",
  "/services": "Services",
  "/costs": "Costs",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Prefix match for nested routes
  for (const [route, title] of Object.entries(ROUTE_TITLES)) {
    if (route !== "/" && pathname.startsWith(route)) return title;
  }
  return "Dashboard";
}

function PageTitle({ pathname }: { pathname: string }) {
  const title = getPageTitle(pathname);
  return (
    <span
      className="text-sm font-medium text-gray-500 dark:text-white/50"
      data-testid="page-title"
    >
      {title}
    </span>
  );
}

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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage("fleet-sidebar-collapsed", false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const dispatcherPausedRef = useRef(false);
  const { data: dashboardData } = useDashboardData();

  useEffect(() => {
    fetch("/api/dispatcher/status")
      .then((r) => r.json())
      .then((d: { paused: boolean }) => {
        dispatcherPausedRef.current = d.paused;
      })
      .catch(() => {});
  }, []);

  const handleToggleDispatcher = useCallback(async () => {
    const wasPaused = dispatcherPausedRef.current;
    const endpoint = wasPaused ? "resume" : "pause";
    try {
      const res = await fetch(`/api/dispatcher/${endpoint}`, { method: "POST" });
      if (!res.ok) throw new Error("Toggle failed");
      dispatcherPausedRef.current = !wasPaused;
      showToast({
        type: "success",
        title: wasPaused ? "Dispatcher resumed" : "Dispatcher paused",
      });
    } catch {
      showToast({ type: "error", title: "Failed to toggle dispatcher" });
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    const themes = ["light", "dark", "system"] as const;
    const current = themes.indexOf(theme as (typeof themes)[number]);
    setTheme(themes[(current + 1) % themes.length]);
  }, [theme, setTheme]);

  const handleCloseModal = useCallback(() => {
    setCreateIssueOpen(false);
    setShortcutsHelpOpen(false);
    setCommandPaletteOpen(false);
  }, []);

  useKeyboardShortcuts({
    onCreateIssue: () => setCreateIssueOpen(true),
    onShowHelp: () => setShortcutsHelpOpen(true),
    onCloseModal: handleCloseModal,
    onToggleDispatcher: () => { void handleToggleDispatcher(); },
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
  });

  const commandItems = buildCommandItems(dashboardData, {
    refresh: () => {},
    toggleTheme: handleToggleTheme,
    scrollToSection: () => {},
    navigate: (path) => router.push(path),
    onNewIssue: () => setCreateIssueOpen(true),
    onToggleDispatcher: () => { void handleToggleDispatcher(); },
    dispatcherPaused: dispatcherPausedRef.current,
  });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0a0b0f] text-gray-900 dark:text-white">
      <SkipLink />
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
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
        <header role="banner" className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0a0b0f]/80 px-4 backdrop-blur-md">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-800 dark:hover:text-white/80 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div className="hidden lg:block">
            <PageTitle pathname={pathname} />
          </div>
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
        <main id="main-content" role="main" className="overflow-x-hidden p-4 lg:p-6">
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

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        items={commandItems}
      />
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
