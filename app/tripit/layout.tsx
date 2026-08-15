import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TripIt",
  description: "Rancang itinerary, bajet dan dokumen perjalanan bersama.",
};

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return children;
}
