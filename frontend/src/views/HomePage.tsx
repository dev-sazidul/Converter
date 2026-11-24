import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { Link } from "@/components/ui/Link";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import { container, focusRing } from "@/lib/utils";

const guides = [
  {
    slug: "/blog/compress-pdf-under-100kb-200kb",
    title: "How to Compress PDFs Under 100KB or 200KB",
    summary: "Practical steps for meeting strict upload caps on job, university, and government portals.",
  },
  {
    slug: "/blog/convert-pdf-tables-to-excel-cleanly",
    title: "Convert PDF Tables to Excel Cleanly",
    summary: "Extract rows and columns from digital PDFs into XLSX without broken alignment.",
  },
  {
    slug: "/blog/pdf-vs-pdfa-long-term-archiving-guide",
    title: "PDF vs PDF/A for Long-Term Archiving",
    summary: "Understand font embedding, color profiles, and when archives require PDF/A-1b, 2b, or 3b.",
  },
  {
    slug: "/blog/how-to-split-pdf-extract-pages-securely",
    title: "Split PDFs & Extract Only the Pages You Need",
    summary: "Share specific ranges instead of sending an entire multi-page document.",
  },
];

export function HomePage() {
  return (
    <div>
      <section className="hero-wash pb-4 pt-14 sm:pt-20">
        <div className={`${container} text-center`}>
          <p className="text-sm font-semibold text-primary">Free online PDF tools</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Every PDF task, clearly done.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Merge, split, compress, edit, OCR, sign, protect, and convert documents without an account. Your files are processed for the task and then deleted.
          </p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 text-sm text-ink sm:flex-row sm:gap-8">
            <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Files deleted automatically</li>
            <li className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" /> Fast server processing</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No account required</li>
          </ul>
          <AdSlot slot="home" format="rectangle" className="mt-10" />
          <ToolBrowser embedded />
        </div>
      </section>

      <section className={`${container} py-12 sm:py-16`}>
        <div className="mx-auto max-w-3xl space-y-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              A complete PDF toolkit on bestconvert.site
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              BestConvert brings 22 focused document tools together in one interface without sign-up walls or watermarks. Every upload is checked from its actual file contents rather than just its filename extension, processed in an isolated temporary job folder, and removed automatically after your download expires.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-base font-semibold text-ink">Organize &amp; Edit Pages</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Combine documents with <Link to="/merge-pdf" className={link}>Merge PDF</Link>, extract specific ranges with <Link to="/split-pdf" className={link}>Split PDF</Link>, or fix sideways scans with <Link to="/rotate-pdf" className={link}>Rotate PDF</Link>. Add text, highlights, or images using <Link to="/edit-pdf" className={link}>Edit PDF</Link>, stamp <Link to="/watermark-pdf" className={link}>Watermarks</Link>, or insert <Link to="/page-numbers" className={link}>Page numbers</Link>.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-base font-semibold text-ink">Optimize, OCR &amp; Repair</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Shrink photo-heavy documents with <Link to="/compress-pdf" className={link}>Compress PDF</Link> to meet portal size limits. Make scanned pages searchable with <Link to="/ocr-pdf" className={link}>OCR PDF</Link>, or attempt structural recovery on damaged files with <Link to="/repair-pdf" className={link}>Repair PDF</Link>.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-base font-semibold text-ink">Convert to &amp; from PDF</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Turn <Link to="/word-to-pdf" className={link}>Word</Link>, <Link to="/excel-to-pdf" className={link}>Excel</Link>, <Link to="/powerpoint-to-pdf" className={link}>PowerPoint</Link>, <Link to="/jpg-to-pdf" className={link}>JPG</Link>, and <Link to="/html-to-pdf" className={link}>HTML</Link> into PDFs, or export PDFs to <Link to="/pdf-to-word" className={link}>Word</Link>, <Link to="/pdf-to-excel" className={link}>Excel</Link>, <Link to="/pdf-to-powerpoint" className={link}>PowerPoint</Link>, <Link to="/pdf-to-jpg" className={link}>JPG</Link>, and <Link to="/pdf-to-pdfa" className={link}>PDF/A</Link>.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-base font-semibold text-ink">Protect, Unlock &amp; Sign</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Encrypt sensitive files with AES-256 using <Link to="/protect-pdf" className={link}>Protect PDF</Link>, remove a known password from authorized files with <Link to="/unlock-pdf" className={link}>Unlock PDF</Link>, or place a visual signature with <Link to="/sign-pdf" className={link}>Sign PDF</Link>.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-ink">Practical Workflow Guides</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Learn how to get cleaner results before and after converting documents, or visit <Link to="/help" className={link}>Help &amp; Limits</Link> for file rules.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guides.map((guide) => (
                <Link
                  key={guide.slug}
                  to={guide.slug}
                  className={`block rounded-2xl border border-line bg-white p-4 transition hover:border-primary/40 ${focusRing}`}
                >
                  <h3 className="text-sm font-semibold text-ink">{guide.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{guide.summary}</p>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              Explore all 22 utilities on <Link to="/tools" className={link}>All PDF tools</Link>, jump to format conversion on <Link to="/convert-pdf" className={link}>Convert PDF</Link>, or read every guide on the <Link to="/blog" className={link}>PDF Blog</Link>.
            </p>
          </div>
        </div>

        <div className="mt-14 max-w-4xl mx-auto">
          <EcosystemTools />
        </div>
      </section>
    </div>
  );
}

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;
