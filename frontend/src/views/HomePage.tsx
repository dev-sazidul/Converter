import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { Link } from "@/components/ui/Link";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import { container, focusRing } from "@/lib/utils";

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
            Merge, split, compress, rotate, and convert documents without an account. Your files are processed for this task and then deleted.
          </p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 text-sm text-ink sm:flex-row sm:gap-8">
            <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Files deleted automatically</li>
            <li className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" /> Usually ready in seconds</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No account required</li>
          </ul>
          <AdSlot slot="home" format="rectangle" className="mt-10" />
          <ToolBrowser embedded />
        </div>
      </section>
      <section className={`${container} py-12 sm:py-16`}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">A free PDF converter for everyday files</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Converter on bestconvert.site merges, splits, compresses, and rotates PDFs, and converts between PDF, Word, Excel, PowerPoint, JPG, HTML, and PDF/A. There is no account. A finished file stays available only until the download expires.
          </p>
          <h3 className="mt-8 text-lg font-semibold text-ink">Organize a PDF</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            <Link to="/merge-pdf" className={link}>Merge PDF</Link> joins files in the order you choose. <Link to="/split-pdf" className={link}>Split PDF</Link> pulls out page ranges or saves each page. <Link to="/rotate-pdf" className={link}>Rotate PDF</Link> turns selected pages clockwise.
          </p>
          <h3 className="mt-8 text-lg font-semibold text-ink">Make a file smaller</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            <Link to="/compress-pdf" className={link}>Compress PDF</Link> shrinks photos and scanned images the most. A PDF that is already small text may stay about the same size, and the result page says so.
          </p>
          <h3 className="mt-8 text-lg font-semibold text-ink">Convert to and from PDF</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Save office files with <Link to="/word-to-pdf" className={link}>Word to PDF</Link>, <Link to="/excel-to-pdf" className={link}>Excel to PDF</Link>, and <Link to="/powerpoint-to-pdf" className={link}>PowerPoint to PDF</Link>. Go the other way with <Link to="/pdf-to-word" className={link}>PDF to Word</Link>, <Link to="/pdf-to-excel" className={link}>PDF to Excel</Link>, and <Link to="/pdf-to-powerpoint" className={link}>PDF to PowerPoint</Link>. Complex layouts can change, and scanned pages are not read because OCR is not available.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            <Link to="/pdf-to-jpg" className={link}>PDF to JPG</Link> makes an image of each page, and <Link to="/jpg-to-pdf" className={link}>JPG to PDF</Link> accepts only JPG or JPEG. <Link to="/html-to-pdf" className={link}>HTML to PDF</Link> uses an HTML file or a public web page. <Link to="/pdf-to-pdfa" className={link}>PDF to PDF/A</Link> writes an archive copy and checks the markers. That check is not a full ISO certification.
          </p>
          <p className="mt-6 text-sm leading-6 text-muted">
            Browse the full list on <Link to="/tools" className={link}>all PDF tools</Link>, open the <Link to="/convert-pdf" className={link}>convert PDF</Link> page, or read our latest workflow guides on the <Link to="/blog" className={link}>PDF Blog</Link>.
          </p>
        </div>
        <div className="mt-14 max-w-4xl mx-auto">
          <EcosystemTools />
        </div>
      </section>
    </div>
  );
}

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;
