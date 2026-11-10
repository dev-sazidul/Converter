import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GA_MEASUREMENT_ID } from "@/lib/ga";
import { AdPopup } from "@/components/ads/AdPopup";
import { AdSlot } from "@/components/ads/AdSlot";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LimitsProvider } from "@/components/limits/LimitsProvider";
import { siteOrigin } from "@/lib/metadata";
import { container, focusRing } from "@/lib/utils";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Free PDF Converter Online — Convarter",
  description: "Free PDF converter to merge, split, compress, rotate, and convert documents. Files are processed for the task and then deleted.",
  applicationName: "Convarter",
  icons: { icon: "/favicon.svg" },
  manifest: "/site.webmanifest",
};

export const viewport = {
  themeColor: "#0C5F5A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={sans.className}>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
            `,
          }}
        />
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <LimitsProvider>
          <div className="flex min-h-screen flex-col">
            <a href="#main" className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 ${focusRing}`}>
              Skip to content
            </a>
            <Header />
            <div className={`${container} pt-4`}>
              <AdSlot slot="header" />
            </div>
            <AdPopup />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </LimitsProvider>
      </body>
    </html>
  );
}
