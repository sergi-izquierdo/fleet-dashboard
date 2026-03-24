import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ProjectSelector } from "@/components/ProjectSelector";

const projects = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
];

describe("ProjectSelector", () => {
  it("renders with 'All Projects' default option", () => {
    const { container } = render(
      <ProjectSelector
        projects={projects}
        selectedProject="all"
        onChange={() => {}}
      />
    );
    const select = container.querySelector("[data-testid='project-selector']") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("all");
  });

  it("renders project options with short names", () => {
    const { container } = render(
      <ProjectSelector
        projects={projects}
        selectedProject="all"
        onChange={() => {}}
      />
    );
    const options = container.querySelectorAll("option");
    const texts = Array.from(options).map((o) => o.textContent);
    expect(texts).toContain("fleet-dashboard");
    expect(texts).toContain("synapse-notes");
    expect(texts).toContain("autotask-engine");
  });

  it("calls onChange when a project is selected", () => {
    let selected = "";
    const { container } = render(
      <ProjectSelector
        projects={projects}
        selectedProject="all"
        onChange={(v) => { selected = v; }}
      />
    );
    const select = container.querySelector("[data-testid='project-selector']") as HTMLSelectElement;
    fireEvent.change(select, {
      target: { value: "sergi-izquierdo/fleet-dashboard" },
    });
    expect(selected).toBe("sergi-izquierdo/fleet-dashboard");
  });

  it("shows the selected project", () => {
    const { container } = render(
      <ProjectSelector
        projects={projects}
        selectedProject="sergi-izquierdo/synapse-notes"
        onChange={() => {}}
      />
    );
    const select = container.querySelector("[data-testid='project-selector']") as HTMLSelectElement;
    expect(select.value).toBe("sergi-izquierdo/synapse-notes");
  });

  it("renders only All Projects when no projects provided", () => {
    const { container } = render(
      <ProjectSelector
        projects={[]}
        selectedProject="all"
        onChange={() => {}}
      />
    );
    const options = container.querySelectorAll("option");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toBe("All Projects");
  });
});
