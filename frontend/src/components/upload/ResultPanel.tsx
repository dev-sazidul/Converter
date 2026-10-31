import { useEffect, useRef } from "react";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JobResult } from "@/lib/api";
import { apiUrl } from "@/lib/api";
import type { ToolDefinition } from "@/lib/tools";
import { formatBytes, formatDuration } from "@/lib/utils";

export function ResultPanel({
  result,
  tool,
  onReset,
}: {
  result: JobResult;
  tool: ToolDefinition;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const saved = Number(result.meta.saved_percent ?? 0);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8" aria-labelledby="result-title">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 id="result-title" ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        Your file is ready
      </h2>
      <p className="mt-2 text-sm text-muted">
        {result.filename} · {formatBytes(result.size_bytes)}
      </p>
      {tool.slug === "compress-pdf" && (
        <p className="mt-3 text-sm text-ink">
          {saved > 0
            ? `Reduced by ${saved}%.`
            : "This file was already compact, so the size stayed about the same."}
        </p>
      )}
      {result.meta.output_kind === "zip" && (
        <p className="mt-3 text-sm text-ink">Several files were packed into a ZIP archive.</p>
      )}
      {typeof result.meta.note === "string" && result.meta.note && (
        <p className="mt-3 text-sm text-ink">{result.meta.note}</p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={apiUrl(result.download_url)}
          download={result.filename}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </a>
        <Button variant="secondary" size="lg" onClick={onReset}>
          Process another file
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted">
        This download stays available for about {formatDuration(result.expires_in_seconds)}, then the file is deleted.
      </p>
    </section>
  );
}
