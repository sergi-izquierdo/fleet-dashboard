import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Costs",
};

export default function CostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
