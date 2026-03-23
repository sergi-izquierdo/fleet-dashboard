"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const themes = ["light", "dark", "system"] as const;

const icons: Record<string, string> = {
  light: "\u2600",
  dark: "\uD83C\uDF19",
  system: "\uD83D\uDCBB",
};

const labels: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <button
        className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white/70 transition-colors"
        aria-label="Toggle theme"
        data-testid="theme-toggle"
        disabled
      >
        ...
      </button>
    );
  }

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme as (typeof themes)[number]);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className="rounded-md border border-white/20 dark:border-white/20 border-gray-300 px-2.5 py-1 text-xs text-white/70 dark:text-white/70 text-gray-600 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-gray-100 hover:text-gray-900 dark:hover:text-white transition-colors"
      aria-label="Toggle theme"
      data-testid="theme-toggle"
    >
      <span data-testid="theme-icon">{icons[theme ?? "system"]}</span>{" "}
      <span data-testid="theme-label">{labels[theme ?? "system"]}</span>
    </button>
  );
}
