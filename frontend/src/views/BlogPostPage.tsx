import React from "react";
import { ArrowLeft, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "@/components/ui/Link";
import { AdSlot } from "@/components/ads/AdSlot";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import type { BlogPost } from "@/lib/blogs";
import { getTool } from "@/lib/tools";
import { container, focusRing } from "@/lib/utils";

function renderMarkdownText(text: string): React.ReactNode {
  const regex = /\[(.*?)\]\((.*?)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];
    if (url.startsWith("http://") || url.startsWith("https://")) {
      parts.push(
        <a
          key={`${match.index}-${url}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark transition-colors"
        >
          {label}
        </a>
      );
    } else {
      parts.push(
        <Link
          key={`${match.index}-${url}`}
          to={url}
          className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark transition-colors"
        >
          {label}
        </Link>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function BlogPostPage({ post }: { post: BlogPost }) {
  const tools = post.relatedTools
    .map((slug) => getTool(slug))
    .filter((t) => t && t.status === "available");

  return (
    <article className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-3xl">
        <nav className="text-sm text-muted" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link to="/" className={`hover:text-primary ${focusRing} rounded-sm`}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/blog" className={`hover:text-primary ${focusRing} rounded-sm`}>
                Blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium truncate max-w-[200px] sm:max-w-md" aria-current="page">
              {post.title}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1 text-muted">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {post.publishedAt}
            </span>
            <span className="inline-flex items-center gap-1 text-muted">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readingTime}
            </span>
            <span className="text-muted">• Author: {post.author}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 rounded-2xl border-l-4 border-primary bg-primary-soft/40 p-4 text-base leading-7 text-ink/90 font-medium">
            {renderMarkdownText(post.summary)}
          </div>
        </header>

        <AdSlot slot="content" className="mt-8" />

        <div className="mt-10 space-y-10 text-base leading-7 text-ink/90">
          {post.sections.map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                {section.heading}
              </h2>

              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-muted leading-7">
                  {renderMarkdownText(p)}
                </p>
              ))}

              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className="mt-3 space-y-2 rounded-2xl bg-muted/5 p-4 border border-line/60">
                  {section.bulletPoints.map((point, ptIdx) => (
                    <li key={ptIdx} className="flex items-start gap-2.5 text-sm leading-6 text-ink/90">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-1" aria-hidden="true" />
                      <div>{renderMarkdownText(point)}</div>
                    </li>
                  ))}
                </ul>
              )}

              {section.tip && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-soft/60 to-primary-soft/20 p-4 sm:p-5 text-sm leading-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-white text-sm">
                      💡
                    </span>
                    <div>
                      <p className="font-semibold text-ink">Pro Workflow Tip</p>
                      <p className="mt-1 text-muted">{renderMarkdownText(section.tip)}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        {tools.length > 0 && (
          <section className="mt-12 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-bold text-ink">Working Tools Mentioned in this Guide</h2>
            <p className="mt-1 text-sm text-muted">
              Use these free online utilities directly in your browser without registration:
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {tools.map((tool) => {
                if (!tool) return null;
                return (
                  <Link
                    key={tool.slug}
                    to={`/${tool.slug}`}
                    className={`flex items-start gap-3 rounded-xl border border-line p-3.5 hover:border-primary/50 hover:bg-primary-soft/30 transition-all ${focusRing}`}
                  >
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-ink">{tool.name}</h3>
                      <p className="mt-0.5 text-xs text-muted line-clamp-1">{tool.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">Open &rarr;</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {post.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-4">
              {post.faqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-ink">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{renderMarkdownText(faq.answer)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <AdSlot slot="tool" format="rectangle" className="mt-10" />

        <div className="mt-12 pt-8 border-t border-line">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to all Guides & Articles
          </Link>
        </div>

        <div className="mt-12">
          <EcosystemTools />
        </div>
      </div>
    </article>
  );
}
