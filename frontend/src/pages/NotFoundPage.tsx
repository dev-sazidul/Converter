import { Link } from "react-router-dom";
import { usePageMeta } from "@/components/seo/usePageMeta";
import { container, focusRing } from "@/lib/utils";

export function NotFoundPage() {
  usePageMeta("Page not found — Convarter", "That page doesn't exist on Convarter.");
  return (
    <div className={`${container} py-20 text-center`}>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">That page isn't here</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
        The address may be mistyped, or the tool may have moved.
      </p>
      <Link to="/" className={`mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white ${focusRing}`}>
        Back to tools
      </Link>
    </div>
  );
}
