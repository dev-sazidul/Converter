import { AdPopup } from "@/components/ads/AdPopup";
import { AdSlot } from "@/components/ads/AdSlot";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LimitsProvider } from "@/components/limits/LimitsProvider";
import { AboutPage } from "@/pages/AboutPage";
import { AllToolsPage } from "@/pages/AllToolsPage";
import { ConvertPdfPage } from "@/pages/ConvertPdfPage";
import { HelpPage } from "@/pages/HelpPage";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { ToolPage } from "@/pages/ToolPage";
import { container, focusRing } from "@/lib/utils";
import { Route, Routes } from "react-router-dom";

export function App() {
  return (
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
        </main>
        <Footer />
      </div>
    </LimitsProvider>
  );
}
