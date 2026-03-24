"use client";

import { useRef, useEffect, useState } from "react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(expanded ? "auto" : 0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (expanded) {
      // Expand: measure content height, animate to it, then set to auto
      const scrollHeight = el.scrollHeight;
      setHeight(scrollHeight);
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setHeight("auto");
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Collapse: set explicit height first, then animate to 0
      const scrollHeight = el.scrollHeight;
      setHeight(scrollHeight);
      setIsAnimating(true);
      // Force reflow before setting to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [expanded]);

  return (
    <section
      id={`section-${id}`}
      aria-label={title}
      className="md:contents"
      data-testid={`collapsible-${id}`}
    >
      {/* Mobile collapsible card wrapper */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 md:contents">
        {/* Mobile header - tap to toggle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between px-4 py-3 text-left md:hidden"
          aria-expanded={expanded}
          aria-controls={`collapsible-content-${id}`}
          data-testid={`collapsible-header-${id}`}
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
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

        {/* Content area - animated on mobile, always visible on desktop */}
        <div
          id={`collapsible-content-${id}`}
          ref={contentRef}
          className="md:!h-auto md:!overflow-visible"
          style={{
            height: typeof height === "number" ? `${height}px` : "auto",
            overflow: isAnimating || !expanded ? "hidden" : "visible",
            transition: isAnimating ? "height 300ms ease-in-out" : "none",
          }}
        >
          <div className="px-4 pb-4 md:p-0">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
