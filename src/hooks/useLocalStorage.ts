"use client";

import { useState, useEffect, useCallback } from "react";

function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Persists state in localStorage. Returns default during SSR/server render,
 * hydrates from localStorage on client mount.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    setValue(readFromStorage(key, defaultValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setStored = useCallback(
    (newValue: T) => {
      setValue(newValue);
      writeToStorage(key, newValue);
    },
    [key]
  );

  return [value, setStored];
}
