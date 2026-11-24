import { Link } from "@/components/ui/Link";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { toolsByCategory } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

export function MoreMenu({ onNavigate }: { onNavigate: () => void }) {
  const categories = toolsByCategory();
  const compactCategories = categories.filter((c) => c.id !== "convert");
  const convertCategory = categories.find((c) => c.id === "convert");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {compactCategories.map((category) => (
          <section key={category.id} aria-labelledby={`more-${category.id}`}>
            <h2
              id={`more-${category.id}`}
              className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              {category.label}
            </h2>
            <ul className="mt-1.5 space-y-0.5">
              {category.tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    to={`/${tool.slug}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-ink hover:bg-primary-soft",
                      focusRing,
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {convertCategory && (
        <section
          aria-labelledby={`more-${convertCategory.id}`}
          className="border-t border-line/70 pt-3.5"
        >
          <h2
            id={`more-${convertCategory.id}`}
            className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {convertCategory.label}
          </h2>
          <ul className="mt-1.5 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {convertCategory.tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  to={`/${tool.slug}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-ink hover:bg-primary-soft",
                    focusRing,
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 whitespace-nowrap">{tool.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-line/70 pt-3">
        <Link
          to="/tools"
          className={cn("inline-flex px-2 text-sm font-semibold text-primary hover:underline", focusRing, "rounded-sm")}
          onClick={onNavigate}
        >
          Open all tools &rarr;
        </Link>
      </div>
    </div>
  );
}
