import { Link, useParams } from "react-router-dom";
import { AdSlot } from "@/components/ads/AdSlot";
import { useLimits } from "@/components/limits/LimitsProvider";
import { usePageMeta } from "@/components/seo/usePageMeta";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { ToolWorkspace } from "@/components/upload/ToolWorkspace";
import { availableTools, getTool, tools } from "@/lib/tools";
import { container, focusRing } from "@/lib/utils";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function ToolPage() {
  const { slug = "" } = useParams();
  const tool = getTool(slug);
  const limits = useLimits();
  usePageMeta(
    tool?.seoTitle ?? "Page not found — Convarter",
    tool?.seoDescription ?? "That page doesn't exist on Convarter.",
  );

  if (!tool) return <NotFoundPage />;

  return (
    <div className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-3xl">
        <nav className="text-sm text-muted" aria-label="Breadcrumb">
          <Link to="/" className={`hover:text-primary ${focusRing} rounded-sm`}>Home</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink">{tool.name}</span>
        </nav>
        <div className="mt-6 flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ToolIcon name={tool.icon} />
          </span>
          <div>
            <h1 className="break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{tool.name}</h1>
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
        <AdSlot slot="tool" format="rectangle" className="mt-10" />
      </div>
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
