import type { Metadata, Viewport } from "next";
import { Archivo_Black, IBM_Plex_Sans } from "next/font/google";
import PwaRegistration from "@/components/PwaRegistration";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  themeColor: "#000000",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Kmlxly Apps",
    template: "%s · Kmlxly Apps",
  },
  description: "Urus bil, bajet, langganan dan perjalanan dalam satu tempat.",
  applicationName: "Kmlxly Apps",
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
    <html lang="ms">
      <body
        suppressHydrationWarning
        className={`${bodyFont.variable} ${displayFont.variable}`}
      >
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
