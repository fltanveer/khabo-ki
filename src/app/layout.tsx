import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Urbanist } from "next/font/google";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

// Self-hosted by next/font. The browser only fetches it when the Bangla rule
// in globals.css actually applies the family.
const bengali = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-bengali",
  display: "swap",
});

// Urbanist: geometric, and good at both ends — weight 200 for the big hero
// numbers, 400–600 for everything people read. Latin-only; Bangla swaps to Hind.
const text = Urbanist({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-text",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Khabo Ki?",
  description: "Office lunch ordering",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f1" },
    { media: "(prefers-color-scheme: dark)", color: "#151412" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getI18n();

  return (
    <html lang={lang} className={`${bengali.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <I18nProvider lang={lang} dict={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
