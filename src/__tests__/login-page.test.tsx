import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import LoginPage from "@/app/login/page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

// Mock next/image with a span to avoid next/no-img-element lint rule
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    return <span role="img" aria-label={props.alt as string} data-src={props.src as string} />;
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("LoginPage", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Fleet Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders the Google SSO button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("renders the Fleet logo", () => {
    render(<LoginPage />);
    expect(screen.getByRole("img", { name: "Fleet logo" })).toBeInTheDocument();
  });

  it("shows error on invalid credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
  });

  it("redirects to dashboard on successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@fleet.dev" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "fleet-admin-2024" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows loading state while submitting", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@fleet.dev" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "fleet-admin-2024" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
    });

    resolvePromise!({ ok: true, json: async () => ({ success: true }) });
  });

  it("shows generic error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@fleet.dev" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    });
  });

  it("has email and password inputs with correct types", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("renders the or divider between Google SSO and form", () => {
    render(<LoginPage />);
    expect(screen.getByText("or")).toBeInTheDocument();
  });
});
