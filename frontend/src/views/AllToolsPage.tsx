import { AdSlot } from "@/components/ads/AdSlot";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

const categoryNotes = [
  {
    name: "Organize",
    description:
      "Combine multiple PDFs in custom order, split out specific page ranges or single pages, and rotate sideways scans by 90°, 180°, or 270°.",
  },
  {
    name: "Optimize",
    description:
      "Reduce image-heavy PDF file sizes, run local Tesseract OCR to make scanned pages searchable, or attempt structural repair on damaged PDFs.",
  },
  {
    name: "Convert",
    description:
      "Convert Word, Excel, PowerPoint, JPG, and HTML into PDFs, or export PDFs back to editable Office formats, JPG images, and archival PDF/A.",
  },
  {
    name: "Edit & Security",
    description:
      "Add text, highlights, watermarks, page numbers, or visual signatures, and apply or remove known AES-256 password protection.",
  },
];

export function AllToolsPage() {
  return (
    <div className="pb-12 pt-10">
      <AdSlot slot="content" className={`${container} pb-8`} />
      <ToolBrowser />

      <section className={`${container} mt-8`}>
        <div className="mx-auto max-w-4xl rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-semibold text-ink">How the 22 PDF tools are organized</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Every tool runs on our server with content-based file checks and automatic temporary file cleanup. Standard limits are 25 MB per file, 100 MB per task, and 150 pages per PDF.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {categoryNotes.map((cat) => (
              <div key={cat.name} className="rounded-2xl border border-line/80 bg-paper/40 p-4">
                <h3 className="text-sm font-semibold text-ink">{cat.name}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">{cat.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">
            Looking specifically for format conversions? Open the dedicated{" "}
            <Link to="/convert-pdf" className={`font-semibold text-primary hover:underline ${focusRing} rounded-sm`}>
              Convert PDF directory
            </Link>
            , check file rules on{" "}
            <Link to="/help" className={`font-semibold text-primary hover:underline ${focusRing} rounded-sm`}>
              Help &amp; Limits
            </Link>
            , or reach out via{" "}
            <Link to="/contact" className={`font-semibold text-primary hover:underline ${focusRing} rounded-sm`}>
              Contact
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
