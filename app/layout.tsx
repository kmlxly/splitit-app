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
};

export const metadata: Metadata = {
  title: "SplitIt - Bill Splitter",
  description: "Split bill dengan member cara brutal.",
  manifest: "/manifest.json", // Link ke fail manifest tadi
  icons: {
    icon: "/icon.png",       // Ini untuk tab browser
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
      <body>{children}</body>
    </html>
  );
}