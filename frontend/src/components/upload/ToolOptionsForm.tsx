import type { ReactNode } from "react";
import type { ToolOptions } from "@/lib/files";
import type { ToolDefinition } from "@/lib/tools";
import { cn, focusRing } from "@/lib/utils";

type ToolOptionsFormProps = {
  tool: ToolDefinition;
  options: ToolOptions;
  onChange: (next: ToolOptions) => void;
};

export function ToolOptionsForm({ tool, options, onChange }: ToolOptionsFormProps) {
  if (tool.slug === "merge-pdf") {
    return <p className="text-sm text-muted">Files are combined from top to bottom. Use the arrows if you need a different order.</p>;
  }
  if (tool.slug === "split-pdf") {
    return (
      <div className="space-y-4">
        <ChoiceRow label="How should the PDF be split?">
          <Choice label="Page ranges" selected={options.splitMode === "ranges"} onClick={() => onChange({ ...options, splitMode: "ranges" })} />
          <Choice label="Every page" selected={options.splitMode === "pages"} onClick={() => onChange({ ...options, splitMode: "pages" })} />
          <Choice label="Fixed interval" selected={options.splitMode === "interval"} onClick={() => onChange({ ...options, splitMode: "interval" })} />
        </ChoiceRow>
        {options.splitMode === "ranges" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink" htmlFor="page-ranges">
              Pages to extract
            </label>
            <input
              id="page-ranges"
              value={options.ranges}
              onChange={(event) => onChange({ ...options, ranges: event.target.value })}
              placeholder="1-3, 5, 8-10"
              className={fieldClass}
            />
            <p className="text-sm text-muted">Use commas between pages or ranges. Page numbers start at 1.</p>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={options.separate}
                onChange={(event) => onChange({ ...options, separate: event.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Save each range as its own PDF
            </label>
          </div>
        )}
        {options.splitMode === "interval" && (
          <label className="block text-sm font-medium text-ink" htmlFor="interval">
            Pages in each file
            <input
              id="interval"
              type="number"
              min={1}
              value={options.interval}
              onChange={(event) => onChange({ ...options, interval: event.target.value })}
              className={cn(fieldClass, "mt-2")}
            />
          </label>
        )}
      </div>
    );
  }
  if (tool.slug === "compress-pdf") {
    return (
      <ChoiceRow label="Compression level">
        <Choice label="High quality" hint="Tidy the file and keep detail." selected={options.quality === "high"} onClick={() => onChange({ ...options, quality: "high" })} />
        <Choice label="Recommended" hint="Recompress images." selected={options.quality === "medium"} onClick={() => onChange({ ...options, quality: "medium" })} />
        <Choice label="Smallest size" hint="Stronger reduction for photos." selected={options.quality === "low"} onClick={() => onChange({ ...options, quality: "low" })} />
      </ChoiceRow>
    );
  }
  if (tool.slug === "rotate-pdf" || tool.slug === "pdf-to-jpg") {
    return (
      <div className="space-y-4">
        {tool.slug === "rotate-pdf" ? (
          <ChoiceRow label="Rotate clockwise">
            <Choice label="90°" selected={options.angle === 90} onClick={() => onChange({ ...options, angle: 90 })} />
            <Choice label="180°" selected={options.angle === 180} onClick={() => onChange({ ...options, angle: 180 })} />
            <Choice label="270°" selected={options.angle === 270} onClick={() => onChange({ ...options, angle: 270 })} />
          </ChoiceRow>
        ) : (
          <ChoiceRow label="Image resolution">
            <Choice label="Screen" hint="96 DPI" selected={options.dpi === 96} onClick={() => onChange({ ...options, dpi: 96 })} />
            <Choice label="Standard" hint="150 DPI" selected={options.dpi === 150} onClick={() => onChange({ ...options, dpi: 150 })} />
            <Choice label="High" hint="200 DPI" selected={options.dpi === 200} onClick={() => onChange({ ...options, dpi: 200 })} />
          </ChoiceRow>
        )}
        <ChoiceRow label="Pages">
          <Choice label="All pages" selected={options.pageMode === "all"} onClick={() => onChange({ ...options, pageMode: "all" })} />
          <Choice label="Custom range" selected={options.pageMode === "custom"} onClick={() => onChange({ ...options, pageMode: "custom" })} />
        </ChoiceRow>
        {options.pageMode === "custom" && (
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="custom-pages">
              Pages to include
            </label>
            <input
              id="custom-pages"
              value={options.pages}
              onChange={(event) => onChange({ ...options, pages: event.target.value })}
              placeholder="1, 3-5"
              className={cn(fieldClass, "mt-2")}
            />
          </div>
        )}
      </div>
    );
  }
  if (tool.slug === "pdf-to-word" || tool.slug === "pdf-to-excel") {
    return (
      <p className="text-sm text-muted">
        {tool.slug === "pdf-to-word"
          ? "Text, tables, and images are copied into Word. Columns, headers, and exact positions may change."
          : "Tables are extracted into separate sheets. A page without a table contributes its selectable text instead. Scanned pages need OCR, which this tool does not do."}
      </p>
    );
  }
  if (tool.slug === "word-to-pdf" || tool.slug === "excel-to-pdf" || tool.slug === "powerpoint-to-pdf") {
    return (
      <p className="text-sm text-muted">
        The file is converted with LibreOffice. A font that is not installed on the server is substituted, and the page order is kept.
      </p>
    );
  }
  if (tool.slug === "pdf-to-powerpoint") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Editable slides place selectable text on the page. Picture slides keep the original layout, and the result tells you which mode was used. Complex layouts may not match the PDF exactly.
        </p>
        <ChoiceRow label="Slide contents">
          <Choice label="Editable text" hint="Text you can select." selected={options.slideMode === "editable"} onClick={() => onChange({ ...options, slideMode: "editable" })} />
          <Choice label="Picture of each page" hint="Layout matches. Text is not editable." selected={options.slideMode === "image"} onClick={() => onChange({ ...options, slideMode: "image" })} />
        </ChoiceRow>
      </div>
    );
  }
  if (tool.slug === "html-to-pdf") {
    const page = options.pageSize === "letter" ? "letter" : "a4";
    return (
      <div className="space-y-4">
        <ChoiceRow label="Source">
          <Choice label="HTML file" selected={options.htmlSource === "file"} onClick={() => onChange({ ...options, htmlSource: "file" })} />
          <Choice label="Web address" selected={options.htmlSource === "url"} onClick={() => onChange({ ...options, htmlSource: "url" })} />
        </ChoiceRow>
        {options.htmlSource === "url" ? (
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="html-url">
              Public web address
            </label>
            <input
              id="html-url"
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              value={options.htmlUrl}
              onChange={(event) => onChange({ ...options, htmlUrl: event.target.value })}
              className={cn(fieldClass, "mt-2")}
            />
            <p className="mt-2 text-sm text-muted">Private, local, and file addresses are blocked. The page is rendered in a browser with a time limit.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Uploaded HTML is rendered without scripts, and it cannot load other websites or local files.</p>
        )}
        <ChoiceRow label="Page size">
          <Choice label="A4" selected={page === "a4"} onClick={() => onChange({ ...options, pageSize: "a4" })} />
          <Choice label="Letter" selected={page === "letter"} onClick={() => onChange({ ...options, pageSize: "letter" })} />
        </ChoiceRow>
      </div>
    );
  }
  if (tool.slug === "pdf-to-pdfa") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          The converted file is checked for a PDF/A marker, an output intent, the original page count, and a readable structure. That check is not a full ISO veraPDF certification, and the download is withheld if it fails.
        </p>
        <ChoiceRow label="PDF/A level">
          <Choice label="PDF/A-1b" selected={options.pdfaLevel === "1b"} onClick={() => onChange({ ...options, pdfaLevel: "1b" })} />
          <Choice label="PDF/A-2b" hint="Recommended" selected={options.pdfaLevel === "2b"} onClick={() => onChange({ ...options, pdfaLevel: "2b" })} />
          <Choice label="PDF/A-3b" selected={options.pdfaLevel === "3b"} onClick={() => onChange({ ...options, pdfaLevel: "3b" })} />
        </ChoiceRow>
      </div>
    );
  }
  if (tool.slug === "jpg-to-pdf") {
    return (
      <div className="space-y-4">
        <ChoiceRow label="Page size">
          <Choice label="Fit image" selected={options.pageSize === "fit"} onClick={() => onChange({ ...options, pageSize: "fit" })} />
          <Choice label="A4" selected={options.pageSize === "a4"} onClick={() => onChange({ ...options, pageSize: "a4" })} />
          <Choice label="Letter" selected={options.pageSize === "letter"} onClick={() => onChange({ ...options, pageSize: "letter" })} />
        </ChoiceRow>
        {options.pageSize !== "fit" && (
          <>
            <ChoiceRow label="Orientation">
              <Choice label="Portrait" selected={options.orientation === "portrait"} onClick={() => onChange({ ...options, orientation: "portrait" })} />
              <Choice label="Landscape" selected={options.orientation === "landscape"} onClick={() => onChange({ ...options, orientation: "landscape" })} />
            </ChoiceRow>
            <ChoiceRow label="Margin">
              <Choice label="None" selected={options.margin === "none"} onClick={() => onChange({ ...options, margin: "none" })} />
              <Choice label="Small" selected={options.margin === "small"} onClick={() => onChange({ ...options, margin: "small" })} />
              <Choice label="Medium" selected={options.margin === "medium"} onClick={() => onChange({ ...options, margin: "medium" })} />
            </ChoiceRow>
          </>
        )}
      </div>
    );
  }
  if (tool.slug === "protect-pdf") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="protect-password">
              Open password
            </label>
            <input
              id="protect-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter password"
              value={options.password}
              onChange={(event) => onChange({ ...options, password: event.target.value })}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="protect-owner-password">
              Owner password (optional)
            </label>
            <input
              id="protect-owner-password"
              type="password"
              autoComplete="new-password"
              placeholder="Defaults to open password"
              value={options.ownerPassword}
              onChange={(event) => onChange({ ...options, ownerPassword: event.target.value })}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Document permissions</legend>
          <div className="flex flex-wrap gap-4 pt-1 text-sm text-ink">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.allowPrint}
                onChange={(event) => onChange({ ...options, allowPrint: event.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Allow printing
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.allowCopy}
                onChange={(event) => onChange({ ...options, allowCopy: event.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Allow copying text &amp; images
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.allowModify}
                onChange={(event) => onChange({ ...options, allowModify: event.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Allow editing
            </label>
          </div>
        </fieldset>
        <p className="text-xs text-muted">Encrypted with AES-256. Passwords are never stored or logged.</p>
      </div>
    );
  }
  if (tool.slug === "unlock-pdf") {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="unlock-password">
            Current PDF password
          </label>
          <input
            id="unlock-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter the password that opens this PDF"
            value={options.password}
            onChange={(event) => onChange({ ...options, password: event.target.value })}
            className={cn(fieldClass, "mt-1.5")}
          />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={options.unlockAuthorized}
            onChange={(event) => onChange({ ...options, unlockAuthorized: event.target.checked })}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>I confirm I am authorized to remove the password from this document.</span>
        </label>
      </div>
    );
  }
  if (tool.slug === "repair-pdf") {
    return (
      <p className="text-sm text-muted">
        Attempts structural cross-reference recovery and Ghostscript re-distillation. Only a validated, readable PDF is returned.
      </p>
    );
  }
  if (tool.slug === "page-numbers") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="pn-position">
              Position
            </label>
            <select
              id="pn-position"
              value={options.numberPosition}
              onChange={(event) =>
                onChange({ ...options, numberPosition: event.target.value as ToolOptions["numberPosition"] })
              }
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="bottom-center">Bottom center</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
              <option value="top-center">Top center</option>
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="pn-format">
              Format
            </label>
            <select
              id="pn-format"
              value={options.numberFormat}
              onChange={(event) =>
                onChange({ ...options, numberFormat: event.target.value as ToolOptions["numberFormat"] })
              }
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="number">1, 2, 3</option>
              <option value="page_of_total">1 / 5</option>
              <option value="page_n">Page 1</option>
              <option value="page_n_of_total">Page 1 of 5</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="pn-start">
              Start at
            </label>
            <input
              id="pn-start"
              type="number"
              min={1}
              max={10000}
              value={options.startNumber}
              onChange={(event) => onChange({ ...options, startNumber: event.target.value })}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="pn-font">
              Font
            </label>
            <select
              id="pn-font"
              value={options.fontName}
              onChange={(event) => onChange({ ...options, fontName: event.target.value as ToolOptions["fontName"] })}
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="helv">Helvetica</option>
              <option value="tiro">Times</option>
              <option value="cour">Courier</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="pn-size">
              Size (pt)
            </label>
            <input
              id="pn-size"
              type="number"
              min={8}
              max={36}
              value={options.fontSize}
              onChange={(event) => onChange({ ...options, fontSize: event.target.value })}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="pn-color">
              Color
            </label>
            <input
              id="pn-color"
              type="color"
              value={options.color}
              onChange={(event) => onChange({ ...options, color: event.target.value })}
              className={cn(fieldClass, "mt-1.5 p-1")}
            />
          </div>
        </div>
        <ChoiceRow label="Pages">
          <Choice label="All pages" selected={options.pageMode === "all"} onClick={() => onChange({ ...options, pageMode: "all" })} />
          <Choice label="Custom range" selected={options.pageMode === "custom"} onClick={() => onChange({ ...options, pageMode: "custom" })} />
        </ChoiceRow>
        {options.pageMode === "custom" && (
          <input
            value={options.pages}
            onChange={(event) => onChange({ ...options, pages: event.target.value })}
            placeholder="2-10"
            className={fieldClass}
          />
        )}
      </div>
    );
  }
  if (tool.slug === "watermark-pdf") {
    return (
      <div className="space-y-4">
        <ChoiceRow label="Watermark type">
          <Choice
            label="Text watermark"
            selected={options.watermarkMode === "text"}
            onClick={() => onChange({ ...options, watermarkMode: "text" })}
          />
          <Choice
            label="Image watermark"
            selected={options.watermarkMode === "image"}
            onClick={() => onChange({ ...options, watermarkMode: "image" })}
          />
        </ChoiceRow>
        {options.watermarkMode === "text" ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem_5rem]">
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="wm-text">
                Watermark text
              </label>
              <input
                id="wm-text"
                value={options.watermarkText}
                maxLength={120}
                onChange={(event) => onChange({ ...options, watermarkText: event.target.value })}
                placeholder="CONFIDENTIAL"
                className={cn(fieldClass, "mt-1.5")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="wm-font-size">
                Size
              </label>
              <input
                id="wm-font-size"
                type="number"
                min={12}
                max={120}
                value={options.fontSize === "11" ? "48" : options.fontSize}
                onChange={(event) => onChange({ ...options, fontSize: event.target.value })}
                className={cn(fieldClass, "mt-1.5")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="wm-color">
                Color
              </label>
              <input
                id="wm-color"
                type="color"
                value={options.color}
                onChange={(event) => onChange({ ...options, color: event.target.value })}
                className={cn(fieldClass, "mt-1.5 p-1")}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="wm-image">
                Watermark image (PNG or JPG)
              </label>
              <input
                id="wm-image"
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={(event) =>
                  onChange({ ...options, watermarkImage: event.target.files?.[0] ?? null })
                }
                className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="wm-scale">
                Width ({Math.round(Number(options.watermarkScale) * 100)}% of page)
              </label>
              <input
                id="wm-scale"
                type="range"
                min={0.1}
                max={0.85}
                step={0.05}
                value={options.watermarkScale}
                onChange={(event) => onChange({ ...options, watermarkScale: event.target.value })}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="wm-pos">
              Position
            </label>
            <select
              id="wm-pos"
              value={options.watermarkPosition}
              onChange={(event) =>
                onChange({ ...options, watermarkPosition: event.target.value as ToolOptions["watermarkPosition"] })
              }
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="center">Center</option>
              <option value="tile">Tile across page</option>
              <option value="top-left">Top left</option>
              <option value="top-center">Top center</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-center">Bottom center</option>
              <option value="bottom-right">Bottom right</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="wm-opacity">
              Opacity ({Math.round(Number(options.watermarkOpacity) * 100)}%)
            </label>
            <input
              id="wm-opacity"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={options.watermarkOpacity}
              onChange={(event) => onChange({ ...options, watermarkOpacity: event.target.value })}
              className="mt-3 w-full accent-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="wm-rot">
              Rotation ({options.watermarkRotation}°)
            </label>
            <input
              id="wm-rot"
              type="range"
              min={-90}
              max={90}
              step={5}
              value={options.watermarkRotation}
              onChange={(event) => onChange({ ...options, watermarkRotation: event.target.value })}
              className="mt-3 w-full accent-primary"
            />
          </div>
        </div>
        {options.watermarkMode === "text" && (
          <div className="rounded-2xl border border-dashed border-line bg-paper/60 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Preview</p>
            <div className="mt-2 flex h-16 items-center justify-center overflow-hidden">
              <span
                className="font-bold select-none"
                style={{
                  color: options.color,
                  opacity: Number(options.watermarkOpacity),
                  transform: `rotate(${options.watermarkRotation}deg)`,
                  fontSize: "1.25rem",
                }}
              >
                {options.watermarkText || "WATERMARK"}
              </span>
            </div>
          </div>
        )}
        <ChoiceRow label="Pages">
          <Choice label="All pages" selected={options.pageMode === "all"} onClick={() => onChange({ ...options, pageMode: "all" })} />
          <Choice label="Custom range" selected={options.pageMode === "custom"} onClick={() => onChange({ ...options, pageMode: "custom" })} />
        </ChoiceRow>
        {options.pageMode === "custom" && (
          <input
            value={options.pages}
            onChange={(event) => onChange({ ...options, pages: event.target.value })}
            placeholder="1, 3-5"
            className={fieldClass}
          />
        )}
      </div>
    );
  }
  if (tool.slug === "ocr-pdf") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="ocr-lang">
              Document language
            </label>
            <select
              id="ocr-lang"
              value={options.ocrLanguage}
              onChange={(event) => onChange({ ...options, ocrLanguage: event.target.value })}
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="eng">English (eng)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
              <option value="ita">Italian (ita)</option>
              <option value="por">Portuguese (por)</option>
            </select>
          </div>
          <ChoiceRow label="Scan resolution">
            <Choice label="Standard" hint="150 DPI" selected={options.ocrDpi === 150} onClick={() => onChange({ ...options, ocrDpi: 150 })} />
            <Choice label="High" hint="200 DPI" selected={options.ocrDpi === 200} onClick={() => onChange({ ...options, ocrDpi: 200 })} />
          </ChoiceRow>
        </div>
        <ChoiceRow label="Pages">
          <Choice label="All pages" selected={options.pageMode === "all"} onClick={() => onChange({ ...options, pageMode: "all" })} />
          <Choice label="Custom range" selected={options.pageMode === "custom"} onClick={() => onChange({ ...options, pageMode: "custom" })} />
        </ChoiceRow>
        {options.pageMode === "custom" && (
          <input
            value={options.pages}
            onChange={(event) => onChange({ ...options, pages: event.target.value })}
            placeholder="1-5"
            className={fieldClass}
          />
        )}
      </div>
    );
  }
  return null;
}

const fieldClass = cn("h-11 w-full rounded-xl border border-line bg-white px-3 text-sm", focusRing);

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Choice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-3 text-left text-sm",
        focusRing,
        selected ? "border-primary bg-primary-soft text-ink" : "border-line bg-white text-ink hover:border-primary/30",
      )}
    >
      <span className="block font-semibold">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </button>
  );
}
