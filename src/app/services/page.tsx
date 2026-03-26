import type { Metadata } from "next";
import ServiceHealth from "@/components/ServiceHealth";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "Services",
};

export default function ServicesPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-white mb-4">Service Health</h1>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <SectionErrorBoundary sectionName="Service Health">
          <ServiceHealth />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
