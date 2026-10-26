import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { POPUP_INTERVAL_MS, popupCreatives } from "@/lib/ads";
import { focusRing } from "@/lib/utils";

export function AdPopup() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const creative = popupCreatives[index % popupCreatives.length];

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), POPUP_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setIndex((current) => current + 1);
  }

  if (!open || !creative) return null;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-popup-title"
        className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pr-10">
          <p id="ad-popup-title" className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Advertisement
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink hover:bg-primary-soft ${focusRing}`}
          onClick={close}
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Close advertisement</span>
        </button>
        <div className="mt-3 overflow-hidden rounded-xl bg-ink">
          {creative.kind === "video" ? (
            <video
              key={creative.src}
              className="aspect-video w-full"
              src={creative.src}
              poster={creative.poster}
              controls
              playsInline
              muted
              autoPlay={!reduceMotion}
              aria-label={creative.alt}
            />
          ) : (
            <img src={creative.src} alt={creative.alt} className="aspect-video w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}
