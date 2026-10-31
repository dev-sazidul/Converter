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
