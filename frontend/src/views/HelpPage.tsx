"use client";

import { AdSlot } from "@/components/ads/AdSlot";
import { useLimits } from "@/components/limits/LimitsProvider";
import { helpFaqs } from "@/lib/help-faq";
import { container } from "@/lib/utils";

export function HelpPage() {
  const limits = useLimits();
  const hours = Math.max(1, Math.round(limits.job_ttl_seconds / 3600));
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">Help</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">How Converter works</h1>
      <ol className="mt-6 space-y-3 text-sm leading-6 text-ink">
        <li>1. Choose a tool and add your files.</li>
        <li>2. Set the options, such as page order, ranges, or image quality.</li>
        <li>3. Download the result. The original upload is removed after processing.</li>
      </ol>
      <AdSlot slot="content" className="mt-8" />
      <h2 className="mt-10 text-xl font-semibold text-ink">Limits</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>Each file can be up to {limits.max_file_size_mb} MB.</li>
        <li>One task can include up to {limits.max_files} files and {limits.max_total_size_mb} MB in total.</li>
        <li>A PDF can have up to {limits.max_pages} pages.</li>
        <li>Downloads stay available for about {hours === 1 ? "1 hour" : `${hours} hours`}, then they are deleted.</li>
        <li>JPG to PDF accepts only .jpg and .jpeg files. PNG and other image types are not.</li>
        <li>Word accepts .doc and .docx, Excel accepts .xls and .xlsx, and PowerPoint accepts .ppt and .pptx. The file contents are checked, not just the name.</li>
        <li>PDF to Word, Excel, and PowerPoint can change a complex layout. PDF to Excel reads tables, and a page with no table contributes its selectable text. Scanned pages need OCR, which is not available.</li>
        <li>HTML to PDF can use an HTML file or a public web address. Private, local, and file addresses are blocked. An uploaded HTML file is rendered without scripts or network access.</li>
        <li>PDF to PDF/A checks the PDF/A marker, output intent, page count, and file structure before the download is offered. That check is not a full ISO certification.</li>
        <li>Password-protected PDFs are rejected. Unlocking them is not available yet.</li>
      </ul>
      <h2 className="mt-10 text-xl font-semibold text-ink">Questions</h2>
      <div className="mt-4 space-y-5 text-sm leading-6">
        {helpFaqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="font-semibold text-ink">{faq.question}</h3>
            <p className="text-muted">{faq.answer}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
