import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import ProjectFilter from "@/components/ProjectFilter";

const mockRepos = ["org/repo-one", "org/repo-two", "org/repo-three"];

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ repos: mockRepos }),
  });
});

afterEach(() => {
  cleanup();
  mockFetch.mockReset();
});

describe("ProjectFilter", () => {
  it("renders the trigger button", () => {
    render(<ProjectFilter value="" onChange={vi.fn()} />);
    expect(screen.getByTestId("project-filter-trigger")).toBeInTheDocument();
  });

  it("shows 'All Projects' when value is empty", () => {
    render(<ProjectFilter value="" onChange={vi.fn()} />);
    expect(screen.getByText("All Projects")).toBeInTheDocument();
  });

  it("shows repo short name when a repo is selected", () => {
    render(<ProjectFilter value="org/repo-one" onChange={vi.fn()} />);
    expect(screen.getByText("repo-one")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows repo list", async () => {
    render(<ProjectFilter value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId("project-filter-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("project-filter-menu")).toBeInTheDocument();
    });

    expect(screen.getByRole("option", { name: "All Projects" })).toBeInTheDocument();
    for (const repo of mockRepos) {
      expect(screen.getByRole("option", { name: repo })).toBeInTheDocument();
    }
  });

  it("calls onChange with selected repo", async () => {
    const onChange = vi.fn();
    render(<ProjectFilter value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("project-filter-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("project-filter-menu")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: "org/repo-two" }));
    expect(onChange).toHaveBeenCalledWith("org/repo-two");
  });

  it("calls onChange with empty string when 'All Projects' is selected", async () => {
    const onChange = vi.fn();
    render(<ProjectFilter value="org/repo-one" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("project-filter-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("project-filter-menu")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: "All Projects" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("closes dropdown after selection", async () => {
    render(<ProjectFilter value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId("project-filter-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("project-filter-menu")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: "org/repo-one" }));
    expect(screen.queryByTestId("project-filter-menu")).not.toBeInTheDocument();
  });
});
