import type { Metadata } from "next";
import ConfigViewer from "@/components/ConfigViewer";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import SystemInfoCard from "@/components/SystemInfoCard";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>

      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-white/70">
          Fleet Configuration
        </h2>
        <SectionErrorBoundary sectionName="Dispatcher Config">
          <ConfigViewer />
        </SectionErrorBoundary>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-white/70">
          System Info
        </h2>
        <SectionErrorBoundary sectionName="System Info">
          <SystemInfoCard />
        </SectionErrorBoundary>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-700 dark:text-white/70">
          Change Password
        </h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-white/40">
          Validate your current password and get the new value to set in your{" "}
          <code className="font-mono">.env.local</code> file.
        </p>
        <SectionErrorBoundary sectionName="Change Password">
          <ChangePasswordForm />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
