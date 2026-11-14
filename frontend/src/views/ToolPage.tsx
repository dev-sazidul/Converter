"use client";

import { Link } from "@/components/ui/Link";
import { AdSlot } from "@/components/ads/AdSlot";
import { useLimits } from "@/components/limits/LimitsProvider";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { ToolWorkspace } from "@/components/upload/ToolWorkspace";
import { getToolCopy } from "@/lib/tool-content";
import { availableTools, getTool, tools, type ToolDefinition } from "@/lib/tools";
import { container, focusRing } from "@/lib/utils";

export function ToolPage({ slug }: { slug: string }) {
  const tool = getTool(slug);
  const limits = useLimits();

  if (!tool) return null;

  return (
    <div className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-3xl">
        <nav className="text-sm text-muted" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li><Link to="/" className={`hover:text-primary ${focusRing} rounded-sm`}>Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/tools" className={`hover:text-primary ${focusRing} rounded-sm`}>All tools</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-ink" aria-current="page">{tool.name}</li>
          </ol>
        </nav>
        <div className="mt-6 flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ToolIcon name={tool.icon} />
          </span>
          <div>
            <h1 className="break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{getToolCopy(tool.slug)?.heading ?? tool.name}</h1>
            <p className="mt-2 text-base leading-7 text-muted">{tool.summary}</p>
            {tool.status === "available" && (
              <p className="mt-2 text-sm text-muted">
                Up to {limits.max_file_size_mb} MB per file and {limits.max_pages} pages. Password-protected PDFs aren't supported yet.
              </p>
            )}
          </div>
        </div>
        <div className="mt-8">
          {tool.status === "available" ? <ToolWorkspace key={tool.slug} tool={tool} /> : <ComingSoon slug={tool.slug} />}
        </div>
        <ImageToolTip slug={tool.slug} />
        {tool.status === "available" && <ToolGuide slug={tool.slug} />}
        <AdSlot slot="tool" format="rectangle" className="mt-10" />
      </div>
    </div>
  );
}

function ToolGuide({ slug }: { slug: string }) {
  const copy = getToolCopy(slug);
  if (!copy) return null;
  const related = copy.related
    .map((item) => getTool(item))
    .filter((item): item is ToolDefinition => Boolean(item && item.status === "available"));
  return (
    <div className="mt-10 space-y-8 border-t border-line pt-8">
      <section>
        <h2 className="text-xl font-semibold text-ink">How this tool works</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{copy.intro}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">How to use it</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">What to expect</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{copy.limits}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Questions</h2>
        <div className="mt-4 space-y-5">
          {copy.faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-sm font-semibold text-ink">{faq.question}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-ink">Related tools</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link to={`/${item.slug}`} className={`block rounded-xl border border-line px-3 py-3 text-sm font-semibold hover:border-primary/40 ${focusRing}`}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ComingSoon({ slug }: { slug: string }) {
  const tool = tools.find((item) => item.slug === slug);
  const alternatives = availableTools().slice(0, 3);
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
      <p className="inline-flex rounded-full bg-soon-soft px-2.5 py-1 text-xs font-semibold text-soon">Coming soon</p>
      <h2 className="mt-4 text-2xl font-semibold text-ink">{tool?.name} isn't available yet</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        This tool is on the roadmap and does not process files. Use one of the working tools below, or check back after it ships.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-3">
        {alternatives.map((item) => (
          <li key={item.slug}>
            <Link to={`/${item.slug}`} className={`block rounded-xl border border-line px-3 py-3 text-sm font-semibold hover:border-primary/40 ${focusRing}`}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImageToolTip({ slug }: { slug: string }) {
  if (!["jpg-to-pdf", "pdf-to-jpg", "compress-pdf"].includes(slug)) return null;

  return (
    <div className="mt-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-soft/60 to-primary-soft/20 p-4 sm:p-5 text-sm leading-6">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white text-base">
          💡
        </span>
        <div>
          <h3 className="font-semibold text-ink">Need to resize, crop, or convert images?</h3>
          <p className="mt-1 text-muted">
            {slug === "jpg-to-pdf" && (
              <>
                Only JPG and JPEG files can be added directly. If you have PNG, WebP, or HEIC images, or need to crop borders and adjust resolutions before converting to PDF, use our free sister tool{" "}
              </>
            )}
            {slug === "pdf-to-jpg" && (
              <>
                After extracting your pages as JPGs, you can crop, resize dimensions, or convert them into PNG or WebP using our free sister tool{" "}
              </>
            )}
            {slug === "compress-pdf" && (
              <>
                If your PDF is large because of high-resolution photos or scanned certificates, you can resize and compress individual images first using our free sister tool{" "}
              </>
            )}
            <a
              href="https://imagecustomize.site"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark"
            >
              ImageCustomize (imagecustomize.site)
            </a>
            {" "}— free online image resizer, compressor, and format converter with zero watermarks or limits.
          </p>
        </div>
      </div>
    </div>
  );
}
