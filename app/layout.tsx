import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Rasa macam native app, tak boleh pinch zoom
  themeColor: "#000000",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Kmlxly Apps",
  description: "Finance & Utility Apps by kmlxly.",
  manifest: "/manifest.json", // Link ke fail manifest tadi
  icons: {
    icon: "/apple-icon.png",  // Menggunakan logo grid (apple-icon.png) untuk favicon
    apple: "/apple-icon.png", // Ini KHAS untuk iPhone 
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SplitIt",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
