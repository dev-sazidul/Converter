import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdPopup } from "@/components/ads/AdPopup";
import { AdSlot } from "@/components/ads/AdSlot";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LimitsProvider } from "@/components/limits/LimitsProvider";
import { container, focusRing } from "@/lib/utils";

const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const AllToolsPage = lazy(() => import("@/pages/AllToolsPage").then((module) => ({ default: module.AllToolsPage })));
const ConvertPdfPage = lazy(() => import("@/pages/ConvertPdfPage").then((module) => ({ default: module.ConvertPdfPage })));
const ToolPage = lazy(() => import("@/pages/ToolPage").then((module) => ({ default: module.ToolPage })));
const HelpPage = lazy(() => import("@/pages/HelpPage").then((module) => ({ default: module.HelpPage })));
const AboutPage = lazy(() => import("@/pages/AboutPage").then((module) => ({ default: module.AboutPage })));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/TermsPage").then((module) => ({ default: module.TermsPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

export function App() {
  return (
    <BrowserRouter>
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
            <Suspense fallback={<p className={`${container} py-24 text-center text-sm text-muted`}>Loading…</p>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/tools" element={<AllToolsPage />} />
                <Route path="/convert-pdf" element={<ConvertPdfPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/:slug" element={<ToolPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </LimitsProvider>
    </BrowserRouter>
  );
}
