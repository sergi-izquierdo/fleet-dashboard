"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  GitPullRequest,
  Server,
  DollarSign,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Activity,
  ListTodo,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/prs", label: "Pull Requests", icon: GitPullRequest },
  { href: "/queue", label: "Queue", icon: ListTodo },
  { href: "/services", label: "Services", icon: Server },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-[#07080a] transition-all duration-200 ${
        collapsed ? "w-[60px]" : "w-[220px]"
      }`}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
          <Activity className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-white">
            Fleet
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              )}
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-blue-400" : "text-white/30 group-hover:text-white/50"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        {/* Fleet status */}
        <div className="flex items-center gap-2.5 px-0.5">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          </div>
          {!collapsed && (
            <span className="text-[11px] font-medium text-white/30">
              Fleet Online
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="mt-3 flex w-full items-center justify-center rounded-md py-1.5 text-white/20 hover:bg-white/[0.04] hover:text-white/40 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

/** Mobile sidebar overlay */
export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/[0.06] bg-[#07080a] animate-slide-in-left">
        <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Fleet
          </span>
        </div>
        <nav className="space-y-0.5 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-blue-500" />
                )}
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-blue-400" : "text-white/30"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-white/30">Fleet Online</span>
        </div>
      </aside>
    </>
  );
}
