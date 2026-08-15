import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SplitIt",
  description: "Bahagi bil, imbas resit dan kira settlement kumpulan.",
};

export default function SplitItLayout({ children }: { children: React.ReactNode }) {
  return children;
}
