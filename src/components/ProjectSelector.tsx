"use client";

import { shortRepoName } from "@/lib/repoUtils";

interface ProjectSelectorProps {
  projects: string[];
  selectedProject: string;
  onChange: (project: string) => void;
}

export function ProjectSelector({
  projects,
  selectedProject,
  onChange,
}: ProjectSelectorProps) {
  return (
    <select
      value={selectedProject}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
      data-testid="project-selector"
      aria-label="Filter by project"
    >
      <option value="all">All Projects</option>
      {projects.map((project) => (
        <option key={project} value={project}>
          {shortRepoName(project)}
        </option>
      ))}
    </select>
  );
}
