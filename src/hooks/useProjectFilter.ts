"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "fleet-project-filter";

export function useProjectFilter() {
  const [selectedProject, setSelectedProject] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) ?? "all";
    }
    return "all";
  });

  const setProject = useCallback((project: string) => {
    setSelectedProject(project);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, project);
    }
  }, []);

  return { selectedProject, setProject };
}
