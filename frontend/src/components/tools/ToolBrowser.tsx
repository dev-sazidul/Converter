"use client";

import { useMemo, useState } from "react";
import { Link } from "@/components/ui/Link";
import { Search } from "lucide-react";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { categories, tools, type CategoryId } from "@/lib/tools";
import { cn, container, focusRing } from "@/lib/utils";

export function ToolBrowser({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");
  const normalized = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      tools.filter((tool) => {
        const inCategory = category === "all" || tool.category === category;
        const inQuery =
          normalized.length === 0 ||
          tool.name.toLowerCase().includes(normalized) ||
          tool.description.toLowerCase().includes(normalized);
        return inCategory && inQuery;
      }),
    [category, normalized],
  );

  return (
    <section id="tools" aria-labelledby="tool-browser-heading" className={cn("text-left", embedded ? "" : "py-10")}>
      <div className={embedded ? "" : container}>
        {!embedded && (
          <>
            <p className="text-sm font-semibold text-primary">Catalog</p>
            <h1 id="tool-browser-heading" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              All PDF tools
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Ready tools process files now. Coming soon tools are labeled and do not upload anything.
            </p>
          </>
        )}
        {embedded && <h2 id="tool-browser-heading" className="sr-only">PDF tools</h2>}
        <div className={cn("mx-auto max-w-xl", embedded ? "mt-8" : "mt-6")}>
          <label className="relative block">
            <span className="sr-only">Search PDF tools</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools, for example merge or compress"
              className={cn(
                "h-12 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm shadow-sm placeholder:text-muted/80",
                focusRing,
              )}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2" role="toolbar" aria-label="Tool categories">
          {categories.map((item) => {
            const selected = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(item.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium",
                  focusRing,
                  selected ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-primary/40",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-sm text-muted" aria-live="polite">
          {visible.length} {visible.length === 1 ? "tool" : "tools"}
        </p>
        {visible.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
            <p className="font-medium text-ink">No tools match that search.</p>
            <button type="button" className={cn("mt-3 text-sm font-semibold text-primary", focusRing)} onClick={() => { setQuery(""); setCategory("all"); }}>
              Clear search
            </button>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((tool) => (
              <li key={tool.slug} className="min-w-0">
                <Link
                  to={`/${tool.slug}`}
                  className={cn(
                    "group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30",
                    focusRing,
                  )}
                >
                  <span className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                    tool.status === "available" ? "bg-primary-soft text-primary" : "bg-paper text-muted",
                  )}>
                    <ToolIcon name={tool.icon} />
                  </span>
                  <span className="mt-4 flex items-center gap-2">
                    <span className="text-base font-semibold text-ink">{tool.name}</span>
                  </span>
                  <span className="mt-1 flex-1 text-sm leading-6 text-muted">{tool.description}</span>
                  <span className={cn(
                    "mt-4 inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
                    tool.status === "available" ? "bg-primary-soft text-primary" : "bg-soon-soft text-soon",
                  )}>
                    {tool.status === "available" ? "Ready" : "Coming soon"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
