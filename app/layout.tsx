import type { Metadata, Viewport } from "next";

// Tambah export Viewport berasingan (Wajib untuk Next.js 14+)
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
    icon: "/icon.png",
    apple: "/icon.png", // Untuk iPhone home screen
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