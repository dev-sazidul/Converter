import { Link } from "@/components/ui/Link";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { toolsByCategory } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

export function MoreMenu({ onNavigate }: { onNavigate: () => void }) {
  const categories = toolsByCategory();

  return (
    <div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <section key={category.id} aria-labelledby={`more-${category.id}`}>
            <h2 id={`more-${category.id}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {category.label}
            </h2>
            <ul className="mt-3 space-y-1">
              {category.tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    to={`/${tool.slug}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-ink hover:bg-primary-soft",
                      focusRing,
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <ToolIcon name={tool.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">{tool.name}</span>
                    {tool.status === "soon" && (
                      <span className="rounded-full bg-soon-soft px-2 py-0.5 text-[11px] font-semibold text-soon">Soon</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Link
        to="/tools"
        className={cn("mt-5 inline-flex text-sm font-medium text-primary hover:underline", focusRing, "rounded-sm")}
        onClick={onNavigate}
      >
        Open all tools
      </Link>
    </div>
  );
}
