"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Eraser, Loader2, PenTool, Plus, Trash2, Upload } from "lucide-react";
import { useLimits } from "@/components/limits/LimitsProvider";
import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/upload/Dropzone";
import { ResultPanel } from "@/components/upload/ResultPanel";
import { ApiError, postForm, type JobResult } from "@/lib/api";
import { validateIncomingFiles } from "@/lib/files";
import type { ToolDefinition } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

type PagePreview = {
  page: number;
  page_count: number;
  width: number;
  height: number;
  image: string;
};

type Placement = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

async function fetchPagePreview(file: File, page: number): Promise<PagePreview> {
  const form = new FormData();
  form.append("files", file, file.name);
  form.set("page", String(page));
  form.set("include_text", "false");
  const res = await fetch("/api/v1/tools/preview", { method: "POST", body: form });
  const body = (await res.json().catch(() => null)) as PagePreview & { error?: { message?: string } };
  if (!res.ok || !body?.image) {
    throw new Error(body?.error?.message || "We couldn't preview that PDF.");
  }
  return body;
}

export function SignPdfWorkspace({ tool }: { tool: ToolDefinition }) {
  const limits = useLimits();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<Record<number, PagePreview>>({});
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [sigMode, setSigMode] = useState<"draw" | "upload">("draw");
  const [inkColor, setInkColor] = useState("#0F172A");
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigAspect, setSigAspect] = useState(0.35);

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const loadPage = useCallback(async (file: File, page: number) => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await fetchPagePreview(file, page);
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
    setPlacements([]);
    setResult(null);
    await loadPage(file, 1);
  }

  async function goToPage(nextPage: number) {
    if (!pdfFile || nextPage < 1 || nextPage > pageCount) return;
    setCurrentPage(nextPage);
    if (!previews[nextPage]) {
      await loadPage(pdfFile, nextPage);
    }
  }

  function exportDrawnSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "signature.png", { type: "image/png" });
      setSigFile(file);
      setSigUrl(URL.createObjectURL(blob));
      setSigAspect(canvas.height / canvas.width);
    }, "image/png");
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    if (sigMode === "draw") {
      setSigFile(null);
      setSigUrl(null);
    }
  }

  function onPointerDownCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height,
    );
  }

  function onPointerMoveCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height,
    );
    ctx.stroke();
  }

  function onPointerUpCanvas() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    exportDrawnSignature();
  }

  function onUploadSignature(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSigAspect(img.height / Math.max(1, img.width));
      setSigFile(file);
      setSigUrl(url);
    };
    img.src = url;
  }

  function placeSignatureOnCurrentPage() {
    if (!sigFile) {
      setError("Draw or upload a signature first.");
      return;
    }
    const preview = previews[currentPage];
    const pageRatio = preview ? preview.width / Math.max(1, preview.height) : 0.77;
    const width = 0.25;
    const height = Math.min(0.35, Math.max(0.05, width * sigAspect * pageRatio));
    const id = crypto.randomUUID();
    setPlacements((prev) => [...prev, { id, page: currentPage, x: 0.37, y: 0.72, width, height }]);
    setSelectedId(id);
    setError(null);
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / rect.width;
      const dy = (e.clientY - drag.startY) / rect.height;
      setPlacements((prev) =>
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
    if (!pdfFile || !sigFile) {
      setError("Upload a PDF and create or upload a signature.");
      return;
    }
    if (placements.length === 0) {
      setError("Click “Place signature on page” before saving.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("files", pdfFile, pdfFile.name);
    form.append("signature_image", sigFile, sigFile.name);
    form.set(
      "placements",
      JSON.stringify(
        placements.map(({ page, x, y, width, height }) => ({ page, x, y, width, height })),
      ),
    );
    try {
      const job = await postForm(tool.endpoint!, form);
      setResult(job);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't sign that PDF.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setPdfFile(null);
    setPreviews({});
    setPlacements([]);
    setResult(null);
    setError(null);
  }

  if (result) {
    return <ResultPanel result={result} tool={tool} onReset={resetAll} />;
  }

  const activePreview = previews[currentPage];
  const pagePlacements = placements.filter((p) => p.page === currentPage);
  const selectedPlacement = placements.find((p) => p.id === selectedId);

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">1. Create or upload your signature</h2>
                <p className="text-xs text-muted">Visual signature only (not a cryptographic X.509 certificate).</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSigMode("draw")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    focusRing,
                    sigMode === "draw" ? "border-primary bg-primary-soft text-primary" : "border-line text-ink",
                  )}
                >
                  <PenTool className="h-3.5 w-3.5" /> Draw
                </button>
                <button
                  type="button"
                  onClick={() => setSigMode("upload")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    focusRing,
                    sigMode === "upload" ? "border-primary bg-primary-soft text-primary" : "border-line text-ink",
                  )}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload PNG/JPG
                </button>
              </div>
            </div>

            {sigMode === "draw" ? (
              <div className="space-y-2">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={160}
                  onPointerDown={onPointerDownCanvas}
                  onPointerMove={onPointerMoveCanvas}
                  onPointerUp={onPointerUpCanvas}
                  className="h-36 w-full touch-none rounded-2xl border border-dashed border-line bg-paper/40 cursor-crosshair"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Ink:</span>
                    {["#0F172A", "#0C5F5A", "#1D4ED8"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Ink color ${c}`}
                        onClick={() => setInkColor(c)}
                        className={cn("h-5 w-5 rounded-full border", inkColor === c ? "ring-2 ring-primary ring-offset-1" : "border-line")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                  >
                    <Eraser className="h-3.5 w-3.5" /> Clear pad
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={(e) => onUploadSignature(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
              />
            )}
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button type="button" size="md" onClick={placeSignatureOnCurrentPage} disabled={!sigUrl}>
                  <Plus className="h-4 w-4" /> Place signature on page {currentPage}
                </Button>
                <button type="button" onClick={resetAll} className="text-xs font-semibold text-muted hover:text-ink">
                  Change PDF
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
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

            {selectedPlacement && selectedPlacement.page === currentPage && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2 text-xs">
                <label className="flex items-center gap-2 font-medium text-ink">
                  Signature size:
                  <input
                    type="range"
                    min={0.1}
                    max={0.6}
                    step={0.02}
                    value={selectedPlacement.width}
                    onChange={(e) => {
                      const nextW = Number(e.target.value);
                      const ratio = nextW / selectedPlacement.width;
                      setPlacements((prev) =>
                        prev.map((p) =>
                          p.id === selectedPlacement.id
                            ? {
                                ...p,
                                width: nextW,
                                height: Math.min(0.6, p.height * ratio),
                                x: Math.min(p.x, 1 - nextW),
                              }
                            : p,
                        ),
                      );
                    }}
                    className="accent-primary"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPlacements((prev) => prev.filter((p) => p.id !== selectedPlacement.id));
                    setSelectedId(null);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-danger"
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
                  {pagePlacements.map((p) => (
                    <div
                      key={p.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(p.id);
                        dragRef.current = {
                          id: p.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: p.x,
                          origY: p.y,
                        };
                      }}
                      className={cn(
                        "absolute cursor-move touch-none rounded border-2 p-0.5",
                        selectedId === p.id ? "border-primary bg-primary/5" : "border-dashed border-primary/60",
                      )}
                      style={{
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        width: `${p.width * 100}%`,
                        height: `${p.height * 100}%`,
                      }}
                    >
                      {sigUrl && <img src={sigUrl} alt="Placed signature" className="h-full w-full object-contain pointer-events-none" />}
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

          <Button type="button" size="lg" disabled={submitting || placements.length === 0} onClick={onSubmit} className="w-full sm:w-auto">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {submitting ? tool.processingLabel : tool.actionLabel}
          </Button>
        </>
      )}
    </div>
  );
}
