import type { Metadata } from "next";
import ServicesPageContent from "@/components/ServicesPageContent";

export const metadata: Metadata = {
  title: "Services",
};

export default function ServicesPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Health</h1>
      <ServicesPageContent />
    </div>
  );
}
