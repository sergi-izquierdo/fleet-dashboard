import type { Metadata } from "next";
import OverviewContent from "./OverviewContent";

export const metadata: Metadata = {
  title: "Overview",
};

export default function OverviewPage() {
  return <OverviewContent />;
}
