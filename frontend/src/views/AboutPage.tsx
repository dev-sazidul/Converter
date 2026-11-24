import { AdSlot } from "@/components/ads/AdSlot";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

export function AboutPage() {
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">About</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">A simpler place to work with PDFs</h1>
      <AdSlot slot="content" className="mt-8" />
      <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
        <p>
          Converter is an independent PDF toolkit developed as part of the FutureSolutionAI ecosystem. It combines files, pulls pages apart, shrinks large documents, rotates pages, and converts between PDF, JPG, Word, Excel, PowerPoint, HTML, and PDF/A.
        </p>
        <p>
          The website sends files to an API on the same server. That API checks the file type, enforces size and page limits, does the work, and keeps the result only long enough to download. There are no accounts in this version.
        </p>
        <p>
          OCR, signatures, and editing are listed so the catalog is easy to scan. They are labeled Coming soon and do not pretend to process a file.
        </p>
        <p>
          Have a question, bug report, or feedback? Reach out through our{" "}
          <Link to="/contact" className={`font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`}>
            Contact page
          </Link>
          .
        </p>
      </div>

      <div className="mt-12">
        <EcosystemTools />
      </div>
    </article>
  );
}
