"use client";

import { Component, type ReactNode } from "react";

interface Props {
  sectionName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 p-6 text-center"
          role="alert"
          data-testid={`error-boundary-${this.props.sectionName}`}
        >
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {this.props.sectionName} unavailable
          </p>
          {this.state.error && (
            <p className="mt-1 text-xs text-red-500/70 dark:text-red-400/50">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="mt-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-white/5 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-h-[44px]"
            data-testid={`retry-${this.props.sectionName}`}
          >
            Tap to retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
