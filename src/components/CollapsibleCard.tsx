"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

interface CollapsibleCardProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  id?: string;
  /** aria-label for the section */
  ariaLabel?: string;
}

export function CollapsibleCard({
  title,
  children,
  defaultExpanded = true,
  id,
  ariaLabel,
}: CollapsibleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>(defaultExpanded ? "none" : "0px");
  const mountedRef = useRef(false);

  // Measure and update maxHeight when expanded state or content changes
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const el = contentRef.current;
    if (!el) return;

    if (expanded) {
      // Set to scrollHeight for the transition, then switch to "none" after transition ends
      const height = el.scrollHeight;
      setMaxHeight(`${height}px`);
      const timer = setTimeout(() => {
        setMaxHeight("none");
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Collapse: first set to current height, then to 0 on next frame
      const height = el.scrollHeight;
      setMaxHeight(`${height}px`);
      // Force reflow before setting to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMaxHeight("0px");
        });
      });
    }
  }, [expanded]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <section id={id} aria-label={ariaLabel} className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors min-h-[44px]"
        data-testid={id ? `${id}-toggle` : undefined}
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-gray-500 dark:text-white/50 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        ref={contentRef}
        style={{ maxHeight, overflow: maxHeight === "none" ? "visible" : "hidden" }}
        className="transition-[max-height] duration-300 ease-in-out"
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Hook to determine if viewport is mobile (<768px).
 * Returns `undefined` during SSR/first render to avoid hydration mismatch.
 */
export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
