"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MoreHorizontal } from "lucide-react";

export interface PRActionMenuProps {
  prNumber: number;
  repo: string;
  status: string;
  onMerge: () => void;
  onClose: () => void;
  disabled?: boolean;
}

export function PRActionMenu({
  prNumber,
  repo,
  status,
  onMerge,
  onClose,
  disabled = false,
}: PRActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  const isOpen = status === "open";

  if (!isOpen) return null;

  return (
    <div className="relative shrink-0" ref={menuRef} data-testid="pr-action-menu">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        disabled={disabled}
        className="flex h-7 w-7 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Actions for PR #${prNumber} in ${repo}`}
        data-testid="pr-action-trigger"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
          data-testid="pr-action-dropdown"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onMerge();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            data-testid="pr-action-merge"
          >
            Squash &amp; Merge
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setShowConfirm(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            data-testid="pr-action-close"
          >
            Close PR
          </button>
        </div>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-testid="pr-close-confirm-dialog"
        >
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-xl w-80 mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Close PR #{prNumber}?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Are you sure you want to close this pull request? This action can be undone by reopening the PR.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirm(false);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                data-testid="pr-close-confirm-cancel"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirm(false);
                  onClose();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                data-testid="pr-close-confirm-submit"
              >
                Close PR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
