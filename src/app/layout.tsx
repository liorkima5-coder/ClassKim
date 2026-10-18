import type { Metadata, Viewport } from "next";
import { Assistant, Rubik } from "next/font/google";
import "./globals.css";

// Rubik לכותרות (עגול וידידותי), Assistant לטקסט רץ (קריא במיוחד בעברית)
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClassKim | הפלאנר למורים",
  description: "מערכת שעות, יומן שיעורים ומעקב הספק לכל כיתה, במקום אחד.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClassKim",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b7a6f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      <body className="font-sans bg-paper text-ink min-h-screen antialiased selection:bg-marker-100 selection:text-ink">
        {children}
      </body>
    </html>
  );
}
