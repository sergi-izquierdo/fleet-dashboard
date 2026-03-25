"use client";

import ConfigViewer from "@/components/ConfigViewer";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-white mb-4">Settings</h1>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Dispatcher Config">
          <ConfigViewer />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
