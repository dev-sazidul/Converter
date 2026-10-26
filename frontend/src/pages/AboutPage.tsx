import { AdSlot } from "@/components/ads/AdSlot";
import { usePageMeta } from "@/components/seo/usePageMeta";
import { container } from "@/lib/utils";

export function AboutPage() {
  usePageMeta("About Convarter", "Convarter is a self-hosted PDF tools site for merge, split, compress, rotate, and image conversion.");
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">About</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">A simpler place to work with PDFs</h1>
      <AdSlot slot="content" className="mt-8" />
      <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
        <p>
          Convarter is an independent PDF toolkit. The first release covers the jobs people repeat most often: combining files, pulling pages apart, shrinking large documents, rotating pages, and moving between PDF and images.
        </p>
        <p>
          The website sends files to an API on the same server. That API checks the file type, enforces size and page limits, does the work, and keeps the result only long enough to download. There are no accounts in this version.
        </p>
        <p>
          Word, Excel, PowerPoint, HTML, PDF/A, OCR, signatures, and editing are listed so the catalog is easy to scan. They are labeled Coming soon and do not pretend to process a file.
        </p>
      </div>
    </article>
  );
}
