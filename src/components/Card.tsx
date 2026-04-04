import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Unified card container — glassmorphic in dark mode, clean white in light mode.
 * Use this instead of ad-hoc border/bg class combinations.
 */
export default function Card({ children, className = "", id }: CardProps) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] p-4 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
