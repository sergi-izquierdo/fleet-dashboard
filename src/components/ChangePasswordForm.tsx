"use client";

import { useState } from "react";

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ApiSuccess {
  success: true;
  message: string;
}

interface ApiError {
  error: string;
}

type ApiResponse = ApiSuccess | ApiError;

function isApiSuccess(res: ApiResponse): res is ApiSuccess {
  return "success" in res && res.success === true;
}

export default function ChangePasswordForm() {
  const [form, setForm] = useState<FormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (form.newPassword.length < 8) {
      setValidationError("New password must be at least 8 characters.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setValidationError("New passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !isApiSuccess(data)) {
        setApiError((data as ApiError).error ?? "An unexpected error occurred.");
        return;
      }

      setSuccessMessage(data.message);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300/80 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/40";

  return (
    <form onSubmit={handleSubmit} data-testid="change-password-form" className="space-y-4">
      <div>
        <label
          htmlFor="currentPassword"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white/70"
        >
          Current Password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={handleChange}
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white/70"
        >
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          value={form.newPassword}
          onChange={handleChange}
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white/70"
        >
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {validationError && (
        <div
          role="alert"
          data-testid="validation-error"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:border-red-400/20 dark:text-red-400"
        >
          {validationError}
        </div>
      )}

      {apiError && (
        <div
          role="alert"
          data-testid="api-error"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:border-red-400/20 dark:text-red-400"
        >
          {apiError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          data-testid="success-message"
          className="space-y-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3.5 py-2.5 text-sm text-green-700 dark:border-green-400/20 dark:text-green-400"
        >
          <p>{successMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
}
