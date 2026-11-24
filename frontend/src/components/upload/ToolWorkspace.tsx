"use client";

import { useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Link } from "@/components/ui/Link";
import { useLimits } from "@/components/limits/LimitsProvider";
import { Dropzone } from "@/components/upload/Dropzone";
import { EditPdfWorkspace } from "@/components/upload/EditPdfWorkspace";
import { FileQueue, type QueueItem } from "@/components/upload/FileQueue";
import { ResultPanel } from "@/components/upload/ResultPanel";
import { SignPdfWorkspace } from "@/components/upload/SignPdfWorkspace";
import { ToolOptionsForm } from "@/components/upload/ToolOptionsForm";
import { Button } from "@/components/ui/Button";
import { ApiError, postForm, type JobResult } from "@/lib/api";
import {
  appendOptions,
  defaultOptions,
  fileCap,
  matchesContent,
  needsContentCheck,
  unsupportedFileMessage,
  validateIncomingFiles,
  validateOptions,
  validateReady,
  type ToolOptions,
} from "@/lib/files";
import { availableTools, type ToolDefinition } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

type Phase = "idle" | "ready" | "processing" | "success" | "error";

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  if (tool.slug === "sign-pdf") {
    return <SignPdfWorkspace tool={tool} />;
  }
  if (tool.slug === "edit-pdf") {
    return <EditPdfWorkspace tool={tool} />;
  }
  return <StandardToolWorkspace tool={tool} />;
}

function StandardToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const limits = useLimits();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [options, setOptions] = useState<ToolOptions>(defaultOptions);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const submitting = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const maxFiles = fileCap(tool, limits);

  async function addFiles(incoming: File[]) {
    if (phase === "processing") return;
    const { accepted, error: problem } = validateIncomingFiles(
      incoming,
      items.map((item) => item.file),
      tool,
      limits,
    );
    const checked: File[] = [];
    let contentError: string | null = null;
    for (const file of accepted) {
      if (needsContentCheck(tool.slug) && !(await matchesContent(file, tool.slug))) {
        contentError ??= unsupportedFileMessage(file.name, tool);
        continue;
      }
      checked.push(file);
    }
    const next = [
      ...items,
      ...checked.map((file) => ({ id: crypto.randomUUID(), file })),
    ];
    setItems(next);
    setResult(null);
    const message = problem ?? contentError;
    if (message) {
      setError(message);
      setPhase(next.length ? "error" : "idle");
      return;
    }
    setError(null);
    setPhase(next.length ? "ready" : "idle");
  }

  function remove(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (next.length === 0) {
      setPhase("idle");
      setError(null);
    } else if (phase !== "processing") {
      setPhase(error ? "error" : "ready");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setItems([]);
    setOptions(defaultOptions);
    setPhase("idle");
    setError(null);
    setProgress(null);
    setResult(null);
  }

  async function onProcess() {
    if (submitting.current || !tool.endpoint) return;
    const fileError = validateReady(items.map((item) => item.file), tool, limits, options);
    const optionError = validateOptions(tool, options);
    const problem = fileError ?? optionError;
    if (problem) {
      setError(problem);
      setPhase("error");
      return;
    }
    submitting.current = true;
    setPhase("processing");
    setError(null);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    const form = new FormData();
    const urlMode = tool.slug === "html-to-pdf" && options.htmlSource === "url";
    if (!urlMode) {
      for (const item of items) form.append("files", item.file, item.file.name);
    }
    appendOptions(form, tool, options);
    try {
      const job = await postForm(tool.endpoint, form, (ratio) => setProgress(ratio >= 1 ? 1 : ratio), controller.signal);
      setResult(job);
      setPhase("success");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "aborted") {
        setPhase(items.length ? "ready" : "idle");
        return;
      }
      setError(caught instanceof ApiError ? caught.message : "We couldn't process that file.");
      setPhase("error");
    } finally {
      submitting.current = false;
      abortRef.current = null;
    }
  }

  function changeOptions(next: ToolOptions) {
    const switchingToUrl = tool.slug === "html-to-pdf" && next.htmlSource === "url";
    if (switchingToUrl) setItems([]);
    setOptions(next);
    if (phase === "processing") return;
    setError(null);
    if (switchingToUrl) {
      setPhase("ready");
      return;
    }
    setPhase(items.length ? (phase === "error" ? "error" : "ready") : "idle");
  }

  const urlMode = tool.slug === "html-to-pdf" && options.htmlSource === "url";
  const showAction = items.length > 0 || urlMode;
  const uploading = phase === "processing" && progress !== null && progress < 1;
  const related = availableTools().filter((item) => item.slug !== tool.slug).slice(0, 3);

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-muted" aria-label="Progress">
        <Step current={phase === "idle" || phase === "ready" || phase === "error"} done={phase === "processing" || phase === "success"}>Add files</Step>
        <Step current={phase === "ready" || phase === "error"} done={phase === "processing" || phase === "success"}>Options</Step>
        <Step current={phase === "success"} done={false}>Download</Step>
      </ol>

      {phase === "success" && result ? (
        <ResultPanel result={result} tool={tool} onReset={reset} />
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onProcess();
          }}
        >
          {tool.slug === "html-to-pdf" && (
            <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
              <ToolOptionsForm tool={tool} options={options} onChange={changeOptions} />
            </div>
          )}

          {!urlMode && items.length === 0 ? (
            <Dropzone
              accept={tool.accept}
              multiple={tool.multiple}
              title={tool.selectLabel}
              hint={`${tool.dropLabel}. Up to ${limits.max_file_size_mb} MB per file.`}
              onFiles={addFiles}
            />
          ) : urlMode ? null : (
            <div className="space-y-4 rounded-3xl border border-line bg-paper/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">
                  {items.length} {items.length === 1 ? "file" : "files"}
                </h2>
                {tool.multiple && items.length < maxFiles && (
                  <Dropzone
                    variant="compact"
                    accept={tool.accept}
                    multiple={tool.multiple}
                    disabled={phase === "processing"}
                    title="Add more files"
                    hint=""
                    onFiles={addFiles}
                  />
                )}
              </div>
              <FileQueue
                items={items}
                reorder={tool.reorder}
                disabled={phase === "processing"}
                onReorder={setItems}
                onRemove={remove}
              />
              {tool.reorder && (
                <p className="text-xs text-muted">Order matters. Move a file up or down, or drag it on a larger screen.</p>
              )}
            </div>
          )}

          {items.length > 0 && tool.slug !== "html-to-pdf" && (
            <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
              <ToolOptionsForm tool={tool} options={options} onChange={changeOptions} />
            </div>
          )}

          {error && (
            <div role="alert" className="flex gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {phase === "processing" && (
            <div className="rounded-2xl border border-line bg-white px-4 py-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-ink">
                  {uploading ? `Uploading ${Math.round((progress ?? 0) * 100)}%` : tool.processingLabel}
                </p>
                {uploading && (
                  <button type="button" className={cn("text-sm font-semibold text-primary", focusRing)} onClick={() => abortRef.current?.abort()}>
                    Cancel
                  </button>
                )}
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-primary-soft"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploading ? Math.round((progress ?? 0) * 100) : undefined}
                aria-valuetext={uploading ? `Uploading ${Math.round((progress ?? 0) * 100)} percent` : tool.processingLabel}
              >
                <div
                  className={cn("h-full bg-primary", uploading ? "" : "animate-pulse")}
                  style={{ width: uploading ? `${Math.round((progress ?? 0) * 100)}%` : "100%" }}
                />
              </div>
            </div>
          )}

          {showAction && (
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={phase === "processing"}>
              {phase === "processing" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {phase === "processing" ? tool.processingLabel : tool.actionLabel}
            </Button>
          )}
        </form>
      )}

      <aside className="mt-10">
        <h2 className="text-sm font-semibold text-ink">More tools</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {related.map((item) => (
            <li key={item.slug}>
              <Link to={`/${item.slug}`} className={cn("block rounded-xl border border-line bg-white px-3 py-3 text-sm font-medium hover:border-primary/30", focusRing)}>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Step({ children, current, done }: { children: string; current: boolean; done: boolean }) {
  return (
    <li className={cn("rounded-full px-3 py-1", current || done ? "bg-primary-soft text-primary" : "bg-white text-muted ring-1 ring-line")}>
      {children}
    </li>
  );
}
