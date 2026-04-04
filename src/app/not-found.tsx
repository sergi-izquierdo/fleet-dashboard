import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <AlertTriangle
            className="h-12 w-12 text-amber-500"
            aria-hidden="true"
          />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Page not found
        </h1>
        <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <nav aria-label="Suggested pages">
          <p className="text-xs font-medium text-gray-400 dark:text-white/30 uppercase tracking-wide mb-3">
            You might be looking for
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link
                href="/"
                data-testid="link-overview"
                className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.06] px-4 py-2 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                href="/agents"
                data-testid="link-agents"
                className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.06] px-4 py-2 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                Agents
              </Link>
            </li>
            <li>
              <Link
                href="/prs"
                data-testid="link-prs"
                className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.06] px-4 py-2 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                Pull Requests
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
