import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import ChangePasswordForm from "@/components/ChangePasswordForm";

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders all form fields and submit button", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
  });

  it("shows validation error when new password is too short", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "short");
    await user.type(screen.getByLabelText("Confirm New Password"), "short");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(screen.getByTestId("validation-error")).toBeInTheDocument();
    expect(
      screen.getByText("New password must be at least 8 characters.")
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpassword2");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(screen.getByTestId("validation-error")).toBeInTheDocument();
    expect(screen.getByText("New passwords do not match.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows success message with env line on successful response", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message:
          "To apply the new password, set FLEET_ADMIN_PASSWORD=mynewpassword in your .env.local file and restart the server.",
        envLine: "FLEET_ADMIN_PASSWORD=mynewpassword",
      }),
    });

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "mynewpassword");
    await user.type(screen.getByLabelText("Confirm New Password"), "mynewpassword");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByTestId("success-message")).toBeInTheDocument();
    });
    expect(screen.getByTestId("env-line")).toHaveTextContent(
      "FLEET_ADMIN_PASSWORD=mynewpassword"
    );
  });

  it("clears form fields after success", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Password change requested.",
        envLine: "FLEET_ADMIN_PASSWORD=mynewpassword",
      }),
    });

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "mynewpassword");
    await user.type(screen.getByLabelText("Confirm New Password"), "mynewpassword");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByTestId("success-message")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Current Password")).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
  });

  it("shows API error when current password is incorrect", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Current password is incorrect" }),
    });

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "wrongpass");
    await user.type(screen.getByLabelText("New Password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Current password is incorrect")).toBeInTheDocument();
  });

  it("shows generic error when fetch throws", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });

  it("sends correct payload to API", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Done",
        envLine: "FLEET_ADMIN_PASSWORD=mynewpassword",
      }),
    });

    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "mynewpassword");
    await user.type(screen.getByLabelText("Confirm New Password"), "mynewpassword");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: "oldpass123",
            newPassword: "mynewpassword",
            confirmPassword: "mynewpassword",
          }),
        })
      );
    });
  });
});
