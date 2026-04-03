import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { FilterBar } from "@/components/FilterBar";

describe("FilterBar", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input with placeholder", () => {
    render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        placeholder="Search agents..."
      />
    );
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search agents...")).toBeInTheDocument();
  });

  it("renders with initial search value", () => {
    render(
      <FilterBar
        searchValue="hello"
        onSearchChange={() => {}}
      />
    );
    const input = screen.getByTestId("filter-bar-search") as HTMLInputElement;
    expect(input.value).toBe("hello");
  });

  it("calls onSearchChange after 300ms debounce", async () => {
    const onChange = vi.fn();
    render(<FilterBar searchValue="" onSearchChange={onChange} />);

    fireEvent.change(screen.getByTestId("filter-bar-search"), {
      target: { value: "fleet" },
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("fleet");
  });

  it("debounces rapid input: only fires once for multiple keystrokes", async () => {
    const onChange = vi.fn();
    render(<FilterBar searchValue="" onSearchChange={onChange} />);

    const input = screen.getByTestId("filter-bar-search");
    fireEvent.change(input, { target: { value: "f" } });
    fireEvent.change(input, { target: { value: "fl" } });
    fireEvent.change(input, { target: { value: "fle" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("fle");
  });

  it("shows result count when provided", () => {
    render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        resultCount={{ shown: 3, total: 12 }}
      />
    );
    expect(screen.getByTestId("filter-bar-result-count")).toBeInTheDocument();
    expect(screen.getByTestId("filter-bar-result-count")).toHaveTextContent(
      "Showing 3 of 12"
    );
  });

  it("does not show result count when not provided", () => {
    render(<FilterBar searchValue="" onSearchChange={() => {}} />);
    expect(screen.queryByTestId("filter-bar-result-count")).not.toBeInTheDocument();
  });

  it("renders children (dropdown slots)", () => {
    render(
      <FilterBar searchValue="" onSearchChange={() => {}}>
        <select data-testid="custom-dropdown">
          <option value="all">All</option>
        </select>
      </FilterBar>
    );
    expect(screen.getByTestId("custom-dropdown")).toBeInTheDocument();
  });

  it("syncs local value when external searchValue prop changes", () => {
    const { rerender } = render(
      <FilterBar searchValue="first" onSearchChange={() => {}} />
    );
    const input = screen.getByTestId("filter-bar-search") as HTMLInputElement;
    expect(input.value).toBe("first");

    rerender(<FilterBar searchValue="second" onSearchChange={() => {}} />);
    expect(input.value).toBe("second");
  });
});
