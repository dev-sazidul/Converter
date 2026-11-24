import { AdSlot } from "@/components/ads/AdSlot";
import { ConvertSection } from "@/components/tools/ConvertSection";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;

export function ConvertPdfPage() {
  return (
    <div className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-primary">Convert</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Convert PDF</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Turn a file into a PDF, or save a PDF as another format. Word, Excel, PowerPoint, HTML, JPG, and PDF/A are ready to use without registration.
        </p>
        <AdSlot slot="content" className="mt-8" />
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <ConvertSection />
        </div>

        <section className="mt-10 space-y-6 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-semibold text-ink">What to expect when converting formats</h2>

          <div className="space-y-4 text-sm leading-6 text-muted">
            <div>
              <h3 className="font-semibold text-ink">Office Documents (Word, Excel, PowerPoint)</h3>
              <p className="mt-1">
                Converting <Link to="/word-to-pdf" className={link}>Word</Link>, <Link to="/excel-to-pdf" className={link}>Excel</Link>, or <Link to="/powerpoint-to-pdf" className={link}>PowerPoint</Link> to PDF uses LibreOffice on the server. Fonts that are not installed on the server are substituted, and wide spreadsheets may wrap across pages. When converting from PDF back to <Link to="/pdf-to-word" className={link}>Word</Link>, <Link to="/pdf-to-excel" className={link}>Excel</Link>, or <Link to="/pdf-to-powerpoint" className={link}>PowerPoint</Link>, selectable text and tables are extracted—scanned pages need <Link to="/ocr-pdf" className={link}>OCR PDF</Link> first.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink">Images &amp; Web Pages</h3>
              <p className="mt-1">
                <Link to="/jpg-to-pdf" className={link}>JPG to PDF</Link> accepts <code>.jpg</code> and <code>.jpeg</code> files verified by file signature and lets you fit each page or standardize on A4 or US Letter. <Link to="/html-to-pdf" className={link}>HTML to PDF</Link> renders uploaded HTML with scripts and network access disabled, or fetches public <code>http://</code> / <code>https://</code> pages while blocking private and local network addresses.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink">Long-Term Archiving (PDF/A)</h3>
              <p className="mt-1">
                <Link to="/pdf-to-pdfa" className={link}>PDF to PDF/A</Link> converts documents to PDF/A-1b, 2b, or 3b and verifies archive markers, output intent, and page structure before offering the download. Note that this automated check is not a formal ISO or veraPDF certification.
              </p>
            </div>
          </div>

          <div className="border-t border-line/70 pt-4 text-sm text-muted">
            Related guides:{" "}
            <Link to="/blog/convert-word-to-pdf-without-formatting-issues" className={link}>Word to PDF tips</Link>
            {" · "}
            <Link to="/blog/convert-pdf-tables-to-excel-cleanly" className={link}>Extracting PDF tables to Excel</Link>
            {" · "}
            <Link to="/blog/pdf-vs-pdfa-long-term-archiving-guide" className={link}>PDF vs PDF/A guide</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
