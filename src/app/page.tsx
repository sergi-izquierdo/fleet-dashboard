import type { Metadata } from "next";
import OverviewContent from "./OverviewContent";

export const metadata: Metadata = {
  title: { absolute: "Fleet Dashboard" },
};

export default function OverviewPage() {
  return <OverviewContent />;
}
