"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { showToast } from "@/components/Toast";

interface Project {
  repo: string;
  url: string;
}

interface CreateIssueDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_LABELS = [
  "agent-local",
  "agent-cloud",
  "bug",
  "enhancement",
  "agent-task",
  "blocked",
];

export function CreateIssueDialog({ open, onClose }: CreateIssueDialogProps) {
  const [repos, setRepos] = useState<string[]>([]);
  const [repo, setRepo] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(["agent-local"]);
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: { projects?: Project[] }) => {
        const repoList = (data.projects ?? []).map((p: Project) => p.repo);
        setRepos(repoList);
        if (repoList.length > 0 && !repo) {
          setRepo(repoList[0]);
        }
      })
      .catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleLabel(label: string) {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  function validateTitle(value: string): string {
    if (!value.trim()) return "Title is required";
    if (value.length > 200) return "Title must be 200 characters or less";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const err = validateTitle(title);
    if (err) {
      setTitleError(err);
      return;
    }

    if (!selectedLabels.includes("agent-local")) {
      showToast({ type: "error", title: "Labels must include agent-local" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/issues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, title: title.trim(), body, labels: selectedLabels }),
      });

      const data = (await response.json()) as {
        success: boolean;
        issueNumber: number;
        url: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        showToast({
          type: "error",
          title: "Failed to create issue",
          description: data.error ?? "Unknown error",
        });
        return;
      }

      showToast({
        type: "success",
        title: `Issue #${data.issueNumber} created`,
        description: data.url,
      });

      // Reset and close
      setTitle("");
      setBody("");
      setSelectedLabels(["agent-local"]);
      setTitleError("");
      onClose();
    } catch {
      showToast({ type: "error", title: "Network error", description: "Could not reach the server" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-issue-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] px-5 py-4">
          <h2
            id="create-issue-title"
            className="text-sm font-semibold text-gray-900 dark:text-white/90"
          >
            New Issue
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-white/70 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Repo */}
          <div>
            <label
              htmlFor="issue-repo"
              className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5"
            >
              Repository
            </label>
            <select
              id="issue-repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-900 dark:text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              required
            >
              {repos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="issue-title"
              className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5"
            >
              Title <span className="text-gray-400 dark:text-white/30">({title.length}/200)</span>
            </label>
            <input
              id="issue-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(validateTitle(e.target.value));
              }}
              placeholder="Brief description of the issue"
              maxLength={200}
              className="w-full rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              required
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-400">{titleError}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <label
              htmlFor="issue-body"
              className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5"
            >
              Body <span className="text-gray-400 dark:text-white/30">(markdown)</span>
            </label>
            <textarea
              id="issue-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detailed description, steps to reproduce, etc."
              rows={5}
              className="w-full resize-y rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Labels */}
          <div>
            <p className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-2">
              Labels
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LABELS.map((label) => {
                const active = selectedLabels.includes(label);
                const isRequired = label === "agent-local";
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => !isRequired && toggleLabel(label)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      active
                        ? "border-blue-500/50 bg-blue-500/15 text-blue-600 dark:text-blue-300"
                        : "border-gray-300 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] text-gray-500 dark:text-white/40 hover:border-gray-400 dark:hover:border-white/20 hover:text-gray-700 dark:hover:text-white/60"
                    } ${isRequired ? "cursor-default opacity-80" : "cursor-pointer"}`}
                    aria-pressed={active}
                    title={isRequired ? "Required label" : undefined}
                  >
                    {label}
                    {isRequired && (
                      <span className="ml-1 opacity-60 text-[10px]">*</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !repo}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {submitting ? "Creating…" : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
