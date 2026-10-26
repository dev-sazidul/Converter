import { Link } from "react-router-dom";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { convertColumnTools } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

export function ConvertSection({
  onNavigate,
  variant = "page",
}: {
  onNavigate?: () => void;
  variant?: "page" | "menu";
}) {
  const columns = convertColumnTools();

  return (
    <div className={cn("grid gap-8 sm:grid-cols-2", variant === "menu" ? "gap-10" : "gap-6")}>
      {columns.map((column) => (
        <section key={column.title} aria-labelledby={headingId(variant, column.title)}>
          <h2
            id={headingId(variant, column.title)}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {column.title}
          </h2>
          <ul className="mt-4 space-y-1">
            {column.tools.map((tool) => (
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
                  <span className="whitespace-nowrap">{tool.name}</span>
                  {tool.status === "soon" && (
                    <span className="ml-auto rounded-full bg-soon-soft px-2 py-0.5 text-[11px] font-semibold text-soon">
                      Soon
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function headingId(variant: string, title: string) {
  return `${variant}-${title.toLowerCase().replace(/\s+/g, "-")}`;
}
