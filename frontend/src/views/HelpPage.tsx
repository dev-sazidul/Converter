"use client";

import { AdSlot } from "@/components/ads/AdSlot";
import { useLimits } from "@/components/limits/LimitsProvider";
import { Link } from "@/components/ui/Link";
import { helpFaqs } from "@/lib/help-faq";
import { container, focusRing } from "@/lib/utils";

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;

export function HelpPage() {
  const limits = useLimits();
  const hours = Math.max(1, Math.round(limits.job_ttl_seconds / 3600));
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">Help</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">How BestConvert works</h1>
      <ol className="mt-6 space-y-3 text-sm leading-6 text-ink">
        <li>1. Choose any of the 22 tools and add your files.</li>
        <li>2. Configure options such as page order, ranges, compression level, password, or placement.</li>
        <li>3. Download the result. Original uploads are removed after processing finishes.</li>
      </ol>
      <AdSlot slot="content" className="mt-8" />

      <h2 className="mt-10 text-xl font-semibold text-ink">File &amp; Processing Limits</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>Each file can be up to {limits.max_file_size_mb} MB.</li>
        <li>One task can include up to {limits.max_files} files and {limits.max_total_size_mb} MB in total.</li>
        <li>A PDF can have up to {limits.max_pages} pages.</li>
        <li>Downloads stay available for about {hours === 1 ? "1 hour" : `${hours} hours`}, then they are deleted.</li>
        <li>JPG to PDF accepts only <code>.jpg</code> and <code>.jpeg</code> files. PNG and other image types are rejected.</li>
        <li>Word accepts <code>.doc</code> and <code>.docx</code>, Excel accepts <code>.xls</code> and <code>.xlsx</code>, and PowerPoint accepts <code>.ppt</code> and <code>.pptx</code>. File contents are checked, not just the extension.</li>
        <li>HTML to PDF accepts an HTML file (rendered without scripts or network access) or a public <code>http://</code> / <code>https://</code> address. Private, local, and file addresses are blocked.</li>
        <li>PDF to PDF/A checks the PDF/A marker, output intent, page count, and file structure before the download is offered. That check is not a full ISO certification.</li>
        <li>Most tools reject password-protected PDFs. Use <Link to="/unlock-pdf" className={link}>Unlock PDF</Link> first if you have the password and authorization.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-ink">Troubleshooting Common Issues</h2>
      <div className="mt-4 space-y-4 text-sm leading-6 text-muted">
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-semibold text-ink">My PDF won&apos;t open or fails during processing</h3>
          <p className="mt-1">
            A damaged cross-reference table or truncated trailer can cause tools to fail. Try running the file through{" "}
            <Link to="/repair-pdf" className={link}>Repair PDF</Link> first, then retry your task.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-semibold text-ink">Converted Word or Excel files are missing text from scanned pages</h3>
          <p className="mt-1">
            <Link to="/pdf-to-word" className={link}>PDF to Word</Link> and{" "}
            <Link to="/pdf-to-excel" className={link}>PDF to Excel</Link> read selectable text and vector tables. If your PDF was created by a scanner or camera, run{" "}
            <Link to="/ocr-pdf" className={link}>OCR PDF</Link> first to add a searchable text layer.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="font-semibold text-ink">My compressed PDF is still over 100 KB or 200 KB</h3>
          <p className="mt-1">
            Use the <strong>Smallest size</strong> option in <Link to="/compress-pdf" className={link}>Compress PDF</Link>, or split out only the pages you need with <Link to="/split-pdf" className={link}>Split PDF</Link>. See our step-by-step guide on{" "}
            <Link to="/blog/compress-pdf-under-100kb-200kb" className={link}>compressing PDFs under 100KB or 200KB</Link>.
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold text-ink">Frequently Asked Questions</h2>
      <div className="mt-4 space-y-5 text-sm leading-6">
        {helpFaqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="font-semibold text-ink">{faq.question}</h3>
            <p className="mt-1 text-muted">{faq.answer}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
        Still stuck or found a bug? Send us the tool name and details via our{" "}
        <Link to="/contact" className={link}>Contact page</Link>.
      </p>
    </article>
  );
}
