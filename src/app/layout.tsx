import type { Metadata } from "next";
import { Geist, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import "./brand-theme.css";
import "./dark-overrides.css";
import "leaflet/dist/leaflet.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LangProvider } from "@/components/lang-provider";
import { BrandingProvider } from "@/components/branding-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MawaridX — نظام إدارة الموارد البشرية",
  description: "MawaridX — نظام متكامل لإدارة الموارد البشرية",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "بوابة الموظف",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${geistSans.variable} ${plexArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('hr_theme');
            if (t === 'dark') document.documentElement.classList.add('dark');
            const l = localStorage.getItem('hr_lang');
            if (l === 'en') { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
          } catch {}
        ` }} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="بوابة الموظف" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-brand-canvas text-brand-ink transition-colors font-arabic">
        <ThemeProvider>
          <LangProvider>
            <BrandingProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </BrandingProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
