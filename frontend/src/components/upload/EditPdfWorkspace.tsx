"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Highlighter, ImagePlus, Loader2, Trash2, Type } from "lucide-react";
import { useLimits } from "@/components/limits/LimitsProvider";
import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/upload/Dropzone";
import { ResultPanel } from "@/components/upload/ResultPanel";
import { ApiError, postForm, type JobResult } from "@/lib/api";
import { validateIncomingFiles } from "@/lib/files";
import type { ToolDefinition } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

type TextBlock = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  font_size: number;
};

type PagePreview = {
  page: number;
  page_count: number;
  width: number;
  height: number;
  image: string;
  text_blocks: TextBlock[];
};

type EditItem =
  | { id: string; type: "text"; page: number; x: number; y: number; width: number; height: number; text: string; font_size: number; color: string }
  | { id: string; type: "replace_text"; page: number; x: number; y: number; width: number; height: number; text: string; font_size: number; color: string }
  | { id: string; type: "rect"; page: number; x: number; y: number; width: number; height: number; color: string; opacity: number; filled: boolean }
  | { id: string; type: "image"; page: number; x: number; y: number; width: number; height: number; image_index: number; previewUrl: string };

async function fetchEditPreview(file: File, page: number): Promise<PagePreview> {
  const form = new FormData();
  form.append("files", file, file.name);
  form.set("page", String(page));
  form.set("include_text", "true");
  const res = await fetch("/api/v1/tools/preview", { method: "POST", body: form });
  const body = (await res.json().catch(() => null)) as PagePreview & { error?: { message?: string } };
  if (!res.ok || !body?.image) {
    throw new Error(body?.error?.message || "We couldn't preview that PDF.");
  }
  return body;
}

export function EditPdfWorkspace({ tool }: { tool: ToolDefinition }) {
  const limits = useLimits();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<Record<number, PagePreview>>({});
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [items, setItems] = useState<EditItem[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTextBlocks, setShowTextBlocks] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const loadPage = useCallback(async (file: File, page: number) => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await fetchEditPreview(file, page);
      setPageCount(data.page_count);
      setPreviews((prev) => ({ ...prev, [page]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load page preview.");
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  async function onPdfFiles(incoming: File[]) {
    const { accepted, error: problem } = validateIncomingFiles(incoming, [], tool, limits);
    if (problem || accepted.length === 0) {
      setError(problem || tool.minMessage);
      return;
    }
    const file = accepted[0];
    setPdfFile(file);
    setPreviews({});
    setCurrentPage(1);
    setItems([]);
    setUploadedImages([]);
    setSelectedId(null);
    setResult(null);
    await loadPage(file, 1);
  }

  async function goToPage(nextPage: number) {
    if (!pdfFile || nextPage < 1 || nextPage > pageCount) return;
    setCurrentPage(nextPage);
    setSelectedId(null);
    if (!previews[nextPage]) {
      await loadPage(pdfFile, nextPage);
    }
  }

  function addTextBox() {
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id,
        type: "text",
        page: currentPage,
        x: 0.1,
        y: 0.15,
        width: 0.4,
        height: 0.08,
        text: "New text",
        font_size: 14,
        color: "#132421",
      },
    ]);
    setSelectedId(id);
  }

  function addHighlightBox() {
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id,
        type: "rect",
        page: currentPage,
        x: 0.12,
        y: 0.25,
        width: 0.35,
        height: 0.06,
        color: "#FDE047",
        opacity: 0.35,
        filled: true,
      },
    ]);
    setSelectedId(id);
  }

  function onAddImage(file: File | null) {
    if (!file) return;
    const idx = uploadedImages.length;
    setUploadedImages((prev) => [...prev, file]);
    const previewUrl = URL.createObjectURL(file);
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id,
        type: "image",
        page: currentPage,
        x: 0.2,
        y: 0.3,
        width: 0.25,
        height: 0.15,
        image_index: idx,
        previewUrl,
      },
    ]);
    setSelectedId(id);
  }

  function replaceBlock(block: TextBlock) {
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id,
        type: "replace_text",
        page: currentPage,
        x: block.x,
        y: block.y,
        width: Math.max(0.15, block.w),
        height: Math.max(0.03, block.h),
        text: block.text,
        font_size: Math.round(block.font_size),
        color: "#132421",
      },
    ]);
    setSelectedId(id);
    setShowTextBlocks(false);
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / rect.width;
      const dy = (e.clientY - drag.startY) / rect.height;
      setItems((prev) =>
        prev.map((item) =>
          item.id === drag.id
            ? {
                ...item,
                x: Math.max(0, Math.min(1 - item.width, drag.origX + dx)),
                y: Math.max(0, Math.min(1 - item.height, drag.origY + dy)),
              }
            : item,
        ),
      );
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  async function onSubmit() {
    if (!pdfFile) return;
    if (items.length === 0) {
      setError("Add at least one edit before saving.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("files", pdfFile, pdfFile.name);
    for (const img of uploadedImages) {
      form.append("images", img, img.name);
    }
    form.set(
      "operations",
      JSON.stringify(
        items.map((item) => {
          if (item.type === "image") {
            return {
              type: item.type,
              page: item.page,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              image_index: item.image_index,
            };
          }
          const { id: _id, ...rest } = item;
          return rest;
        }),
      ),
    );
    try {
      const job = await postForm(tool.endpoint!, form);
      setResult(job);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save edits to that PDF.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setPdfFile(null);
    setPreviews({});
    setItems([]);
    setUploadedImages([]);
    setSelectedId(null);
    setResult(null);
    setError(null);
  }

  if (result) {
    return <ResultPanel result={result} tool={tool} onReset={resetAll} />;
  }

  const activePreview = previews[currentPage];
  const pageItems = items.filter((item) => item.page === currentPage);
  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <div className="space-y-5">
      {!pdfFile ? (
        <Dropzone
          accept={tool.accept}
          multiple={false}
          title={tool.selectLabel}
          hint={`${tool.dropLabel}. Up to ${limits.max_file_size_mb} MB per file.`}
          onFiles={onPdfFiles}
        />
      ) : (
        <>
          <div className="rounded-3xl border border-line bg-white p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="md" variant="secondary" onClick={addTextBox}>
                  <Type className="h-4 w-4" /> Add Text
                </Button>
                <Button type="button" size="md" variant="secondary" onClick={addHighlightBox}>
                  <Highlighter className="h-4 w-4" /> Add Highlight
                </Button>
                <Button type="button" size="md" variant="secondary" onClick={() => imageInputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> Add Image
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    onAddImage(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowTextBlocks((v) => !v)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    focusRing,
                    showTextBlocks ? "border-primary bg-primary-soft text-primary" : "border-line text-ink",
                  )}
                >
                  {showTextBlocks ? "Hide PDF text" : "Edit existing text"}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button type="button" onClick={resetAll} className="mr-2 text-xs font-semibold text-muted hover:text-ink">
                  Change PDF
                </button>
                <button
                  type="button"
                  disabled={currentPage <= 1 || loadingPreview}
                  onClick={() => void goToPage(currentPage - 1)}
                  className="rounded-lg border border-line p-1.5 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-ink">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= pageCount || loadingPreview}
                  onClick={() => void goToPage(currentPage + 1)}
                  className="rounded-lg border border-line p-1.5 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showTextBlocks && activePreview && activePreview.text_blocks.length === 0 && (
              <p className="rounded-xl bg-paper px-3 py-2 text-xs text-muted">
                No selectable text found on this page (it may be a scanned image). Use Add Text or run OCR PDF first.
              </p>
            )}

            {selectedItem && selectedItem.page === currentPage && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3 text-xs">
                {(selectedItem.type === "text" || selectedItem.type === "replace_text") && (
                  <>
                    <input
                      value={selectedItem.text}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) => (it.id === selectedItem.id ? { ...it, text: e.target.value } : it)),
                        )
                      }
                      className="h-9 flex-1 min-w-[10rem] rounded-lg border border-line bg-white px-2.5 text-sm text-ink"
                      aria-label="Edit text content"
                    />
                    <label className="flex items-center gap-1.5">
                      Size
                      <input
                        type="number"
                        min={6}
                        max={72}
                        value={selectedItem.font_size}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === selectedItem.id ? { ...it, font_size: Number(e.target.value) || 12 } : it,
                            ),
                          )
                        }
                        className="h-9 w-16 rounded-lg border border-line bg-white px-2 text-sm"
                      />
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) => (it.id === selectedItem.id ? { ...it, color: e.target.value } : it)),
                        )
                      }
                      className="h-9 w-10 rounded-lg border border-line bg-white p-0.5"
                      aria-label="Text color"
                    />
                  </>
                )}
                <label className="flex items-center gap-1.5">
                  Width
                  <input
                    type="range"
                    min={0.08}
                    max={0.9}
                    step={0.02}
                    value={selectedItem.width}
                    onChange={(e) => {
                      const nextW = Number(e.target.value);
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === selectedItem.id ? { ...it, width: nextW, x: Math.min(it.x, 1 - nextW) } : it,
                        ),
                      );
                    }}
                    className="accent-primary"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setItems((prev) => prev.filter((it) => it.id !== selectedItem.id));
                    setSelectedId(null);
                  }}
                  className="ml-auto inline-flex items-center gap-1 font-semibold text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            )}

            <div className="relative mx-auto max-w-xl overflow-hidden rounded-xl border border-line bg-paper/40">
              {loadingPreview || !activePreview ? (
                <div className="flex h-80 items-center justify-center text-sm text-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading page preview…
                </div>
              ) : (
                <div ref={stageRef} className="relative select-none">
                  <img src={activePreview.image} alt={`Page ${currentPage}`} className="block w-full h-auto" draggable={false} />
                  {showTextBlocks &&
                    activePreview.text_blocks.map((block, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => replaceBlock(block)}
                        title={`Click to edit: ${block.text}`}
                        className="absolute border border-primary/70 bg-primary/10 hover:bg-primary/25 transition-colors"
                        style={{
                          left: `${block.x * 100}%`,
                          top: `${block.y * 100}%`,
                          width: `${block.w * 100}%`,
                          height: `${block.h * 100}%`,
                        }}
                      />
                    ))}
                  {pageItems.map((item) => (
                    <div
                      key={item.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                        dragRef.current = {
                          id: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: item.x,
                          origY: item.y,
                        };
                      }}
                      className={cn(
                        "absolute cursor-move touch-none rounded border-2",
                        selectedId === item.id ? "border-primary" : "border-dashed border-primary/60",
                        item.type === "replace_text" && "bg-white/95",
                      )}
                      style={{
                        left: `${item.x * 100}%`,
                        top: `${item.y * 100}%`,
                        width: `${item.width * 100}%`,
                        height: `${item.height * 100}%`,
                        backgroundColor: item.type === "rect" ? item.color : undefined,
                        opacity: item.type === "rect" ? item.opacity + 0.25 : 1,
                      }}
                    >
                      {(item.type === "text" || item.type === "replace_text") && (
                        <span
                          className="block truncate px-1 leading-tight"
                          style={{ color: item.color, fontSize: `${Math.max(10, item.font_size * 0.85)}px` }}
                        >
                          {item.text}
                        </span>
                      )}
                      {item.type === "image" && (
                        <img src={item.previewUrl} alt="Added element" className="h-full w-full object-contain pointer-events-none" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="flex gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <Button type="button" size="lg" disabled={submitting || items.length === 0} onClick={onSubmit} className="w-full sm:w-auto">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {submitting ? tool.processingLabel : tool.actionLabel}
          </Button>
        </>
      )}
    </div>
  );
}
