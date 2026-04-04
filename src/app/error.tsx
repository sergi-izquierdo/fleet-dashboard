"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <AlertTriangle
            className="h-12 w-12 text-amber-500 animate-pulse"
            aria-hidden="true"
          />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
          An unexpected error occurred. You can try again or go back to the home page.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={reset}
            data-testid="try-again-button"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            data-testid="go-home-link"
            className="rounded-lg border border-gray-200 dark:border-white/[0.08] px-5 py-2 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            Go Home
          </Link>
        </div>

        <button
          onClick={() => setShowDetails((v) => !v)}
          data-testid="toggle-details-button"
          className="text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
          aria-expanded={showDetails}
        >
          {showDetails ? "Hide" : "Show"} error details
        </button>

        {showDetails && (
          <div
            data-testid="error-details"
            className="mt-3 rounded-lg border border-gray-100 dark:border-white/[0.04] bg-gray-50 dark:bg-white/[0.02] p-3 text-left"
          >
            <p className="text-xs font-mono text-red-500 dark:text-red-400 break-all">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-gray-400 dark:text-white/30">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
