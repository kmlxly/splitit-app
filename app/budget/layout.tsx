import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Budget.AI",
  description: "Jejak aliran wang, bajet bulanan dan corak perbelanjaan.",
};

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
