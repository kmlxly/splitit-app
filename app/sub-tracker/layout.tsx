import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sub.Tracker",
  description: "Pantau komitmen tetap dan langganan berulang.",
};

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
