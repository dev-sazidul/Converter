import { BookOpen, Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "@/components/ui/Link";
import { AdSlot } from "@/components/ads/AdSlot";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import { getAllBlogs } from "@/lib/blogs";
import { getTool } from "@/lib/tools";
import { container, focusRing } from "@/lib/utils";

export function BlogIndexPage() {
  const blogs = getAllBlogs();

  return (
    <div className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-4xl">
        <nav className="text-sm text-muted" aria-label="Breadcrumb">
          <ol className="flex items-center gap-x-2">
            <li>
              <Link to="/" className={`hover:text-primary ${focusRing} rounded-sm`}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink font-medium" aria-current="page">
              Blog
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Workflow Guides & Tutorials</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            PDF & Document Workflow Knowledge Base
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            Practical, in-depth guides on optimizing file sizes, converting tabular data to spreadsheets, meeting ISO archival standards, and streamlining document operations.
          </p>
        </header>

        <AdSlot slot="content" className="mt-8" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {blogs.map((blog) => (
            <article
              key={blog.slug}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-semibold text-primary">
                    {blog.category}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {blog.readingTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {blog.publishedAt}
                    </span>
                  </div>
                </div>

                <h2 className="mt-4 text-xl font-bold tracking-tight text-ink group-hover:text-primary transition-colors">
                  <Link to={`/blog/${blog.slug}`} className={`${focusRing} rounded-sm`}>
                    {blog.title}
                  </Link>
                </h2>

                <p className="mt-3 text-sm leading-6 text-muted line-clamp-3">
                  {blog.summary}
                </p>

                {blog.relatedTools.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {blog.relatedTools.slice(0, 3).map((slug) => {
                      const tool = getTool(slug);
                      if (!tool) return null;
                      return (
                        <Link
                          key={slug}
                          to={`/${slug}`}
                          className="rounded-md bg-muted/10 px-2 py-0.5 text-xs font-medium text-ink/80 hover:bg-primary-soft hover:text-primary transition-colors"
                        >
                          {tool.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-line/60">
                <Link
                  to={`/blog/${blog.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-all"
                >
                  Read Full Guide
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16">
          <EcosystemTools />
        </div>
      </div>
    </div>
  );
}

