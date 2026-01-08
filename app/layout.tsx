import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SplitIt. by kmlxly",
  description: "Bahagi bill cara tenang dan moden.",
  icons: {
    icon: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // TUKAR SINI: Warna hitam 'Brutalism' (#191919) supaya bar phone nampak seamless
  themeColor: "#191919", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className={`${inter.className} bg-[#191919]`}>{children}</body>
    </html>
  );
}