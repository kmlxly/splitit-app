import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. Ini bahagian Metadata (Tajuk & Icon)
export const metadata: Metadata = {
  title: "SplitIt. by kmlxly",
  description: "Bahagi bill cara tenang dan moden.",
  icons: {
    icon: "/icon.png",
  },
};

// 2. Ini bahagian Viewport (Zoom Setting) - Kena ASING dari Metadata
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Ini yang halang auto-zoom bila taip
  themeColor: "#0f172a", // Warna bar phone (optional, nampak kemas)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}