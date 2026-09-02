import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// הוספת פונט עברי מודרני ונקי
const heebo = Heebo({ 
  subsets: ["hebrew"],
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
});

// הגדרת המטא-דאטה, חיבור למניפסט, התאמה לאייפון ושמירה על האייקונים שלך
export const metadata: Metadata = {
  title: "ClassKim | הפלאנר החכם למורים",
  description: "מערכת תכנון, ניהול ומעקב חכמה, המעוצבת במיוחד למורים שרוצים לעשות סדר בבלאגן.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ClassKim',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

// צבע שורת הסטטוס (בטריה/שעון) בנייד
export const viewport: Viewport = {
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      {/* רקע גלובלי עם גרדיאנט עדין וטקסטראלי שמשפר מיד את המראה של כל הדפים */}
      <body className={`${heebo.className} bg-slate-50 text-slate-900 selection:bg-indigo-200 selection:text-indigo-900 min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-slate-50 to-slate-100`}>
        {children}
      </body>
    </html>
  );
}
