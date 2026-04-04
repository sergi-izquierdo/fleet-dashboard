"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "data-testid"?: string;
}

/**
 * Shared modal wrapper that provides:
 * - Focus trap (Tab/Shift+Tab cycles within the modal)
 * - Focus restoration to the trigger element on close
 * - Body scroll prevention (overflow:hidden) while open
 * - Backdrop with z-50 (above BottomNav z-40)
 * - Escape key to close
 */
export function Modal({
  open,
  onClose,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "data-testid": testId,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Body scroll lock + focus management on open/close
  useEffect(() => {
    if (!open) return;

    // Save the element that triggered the modal so we can restore focus on close
    triggerRef.current = document.activeElement;

    // Prevent background scroll on mobile and desktop
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first focusable element inside the modal
    const el = containerRef.current;
    if (el) {
      const first = el.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
      first?.focus();
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      // Restore focus to the element that opened the modal
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  // Keyboard: Escape to close, Tab to trap focus
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const el = containerRef.current;
      if (!el) return;

      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab at first element → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab at last element → wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop — sits above BottomNav (z-40) via parent z-50 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
