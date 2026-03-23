"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface TerminalViewerProps {
  sessionName: string;
  onClose: () => void;
}

interface TerminalResponse {
  sessionName: string;
  output: string;
  error?: string;
}

/** Minimal ANSI-strip: remove escape sequences so we render plain text. */
function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Highlight lines that look like code-block fences, errors, prompts, etc.
 * Returns an array of React elements for each line.
 */
function highlightLines(output: string) {
  const lines = output.split("\n");
  return lines.map((raw, i) => {
    const line = stripAnsi(raw);

    // Error lines
    if (/error[:\s]/i.test(line) || /fatal:/i.test(line) || /ENOENT/.test(line)) {
      return (
        <span key={i} className="text-red-400">
          {line}
          {"\n"}
        </span>
      );
    }

    // Warning lines
    if (/warn(ing)?[:\s]/i.test(line)) {
      return (
        <span key={i} className="text-yellow-400">
          {line}
          {"\n"}
        </span>
      );
    }

    // Success / passing
    if (/pass(ed|ing)?/i.test(line) || /success/i.test(line) || /✓/.test(line)) {
      return (
        <span key={i} className="text-green-400">
          {line}
          {"\n"}
        </span>
      );
    }

    // Shell prompts ($ or >)
    if (/^\s*[\$#>]/.test(line)) {
      return (
        <span key={i} className="text-blue-400">
          {line}
          {"\n"}
        </span>
      );
    }

    // Code-block fences
    if (/^```/.test(line.trim())) {
      return (
        <span key={i} className="text-purple-400">
          {line}
          {"\n"}
        </span>
      );
    }

    // Git diff + / -
    if (/^\+[^+]/.test(line)) {
      return (
        <span key={i} className="text-green-400">
          {line}
          {"\n"}
        </span>
      );
    }
    if (/^-[^-]/.test(line)) {
      return (
        <span key={i} className="text-red-400">
          {line}
          {"\n"}
        </span>
      );
    }

    return (
      <span key={i}>
        {line}
        {"\n"}
      </span>
    );
  });
}

export default function TerminalViewer({
  sessionName,
  onClose,
}: TerminalViewerProps) {
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollLock, setScrollLock] = useState(false);
  const terminalRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (!scrollLock && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [scrollLock]);

  const fetchTerminal = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionName)}/terminal`
      );
      const data: TerminalResponse = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setError(null);
        setOutput(data.output);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch terminal"
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionName]);

  // Initial fetch + polling
  useEffect(() => {
    fetchTerminal();
    const interval = setInterval(fetchTerminal, 3000);
    return () => clearInterval(interval);
  }, [fetchTerminal]);

  // Auto-scroll when output changes
  useEffect(() => {
    scrollToBottom();
  }, [output, scrollToBottom]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
      role="dialog"
      aria-label={`Terminal output for ${sessionName}`}
      data-testid="terminal-viewer"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Terminal icon */}
          <svg
            className="h-4 w-4 flex-shrink-0 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h2
            className="text-sm font-semibold text-white truncate"
            data-testid="terminal-session-name"
          >
            {sessionName}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll lock toggle */}
          <button
            onClick={() => setScrollLock(!scrollLock)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              scrollLock
                ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-400"
                : "border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            title={scrollLock ? "Auto-scroll paused" : "Auto-scroll active"}
            data-testid="scroll-lock-toggle"
          >
            {scrollLock ? "Scroll locked" : "Auto-scroll"}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close terminal viewer"
            data-testid="terminal-close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal body */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm text-white/50">Loading terminal output...</div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-400"
            role="alert"
            data-testid="terminal-error"
          >
            {error}
          </div>
        </div>
      ) : (
        <pre
          ref={terminalRef}
          className="flex-1 overflow-auto p-4 font-mono text-xs leading-5 text-gray-300 sm:text-sm"
          data-testid="terminal-output"
        >
          {highlightLines(output)}
        </pre>
      )}
    </div>
  );
}
