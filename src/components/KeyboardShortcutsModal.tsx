"use client";

import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["g", "o"], description: "Go to Overview" },
      { keys: ["g", "a"], description: "Go to Agents" },
      { keys: ["g", "p"], description: "Go to Pull Requests" },
      { keys: ["g", "q"], description: "Go to Queue" },
      { keys: ["g", "c"], description: "Go to Costs" },
      { keys: ["g", "s"], description: "Go to Settings" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["n"], description: "New Issue" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close modal / dialog" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} aria-label="Keyboard shortcuts">
      <div
        className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#12141a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white/90">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/30">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-white/60">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-white/[0.12] bg-white/[0.06] px-1.5 font-mono text-xs text-white/70">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-xs text-white/20">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
