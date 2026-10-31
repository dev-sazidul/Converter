import { AdSlot } from "@/components/ads/AdSlot";
import { ConvertSection } from "@/components/tools/ConvertSection";
import { usePageMeta } from "@/components/seo/usePageMeta";
import { container } from "@/lib/utils";

export function ConvertPdfPage() {
  usePageMeta(
    "Convert PDF — Convarter",
    "Convert documents, HTML, and images to PDF, or save a PDF as Word, Excel, PowerPoint, JPG, or PDF/A.",
  );

  return (
    <div className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-primary">Convert</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Convert PDF</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Turn a file into a PDF, or save a PDF as another format. Word, Excel, PowerPoint, HTML, JPG, and PDF/A are ready to use.
        </p>
        <AdSlot slot="content" className="mt-8" />
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <ConvertSection />
        </div>
      </div>
    </div>
  );
}
