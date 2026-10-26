import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { usePageMeta } from "@/components/seo/usePageMeta";
import { container } from "@/lib/utils";

export function HomePage() {
  usePageMeta(
    "Home — Convarter",
    "Merge, split, compress, rotate, and convert PDFs in your browser. Files are processed for the task and then deleted.",
  );

  return (
    <div>
      <section className="hero-wash pb-4 pt-14 sm:pt-20">
        <div className={`${container} text-center`}>
          <p className="text-sm font-semibold text-primary">Free online PDF tools</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Every PDF task, clearly done.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Merge, split, compress, rotate, and convert documents without an account. Your files are processed for this task and then deleted.
          </p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 text-sm text-ink sm:flex-row sm:gap-8">
            <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Files deleted automatically</li>
            <li className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" /> Usually ready in seconds</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No account required</li>
          </ul>
          <AdSlot slot="home" format="rectangle" className="mt-10" />
          <ToolBrowser embedded />
        </div>
      </section>
    </div>
  );
}
