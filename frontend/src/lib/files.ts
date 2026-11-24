import type { Limits } from "@/lib/api";
import type { ToolDefinition } from "@/lib/tools";

export type ToolOptions = {
  splitMode: "ranges" | "pages" | "interval";
  ranges: string;
  interval: string;
  separate: boolean;
  quality: "high" | "medium" | "low";
  angle: 90 | 180 | 270;
  pageMode: "all" | "custom";
  pages: string;
  dpi: 96 | 150 | 200;
  pageSize: "fit" | "a4" | "letter";
  orientation: "portrait" | "landscape";
  margin: "none" | "small" | "medium";
  slideMode: "editable" | "image";
  pdfaLevel: "1b" | "2b" | "3b";
  htmlSource: "file" | "url";
  htmlUrl: string;
  // Protect / Unlock PDF
  password: string;
  ownerPassword: string;
  allowPrint: boolean;
  allowCopy: boolean;
  allowModify: boolean;
  unlockAuthorized: boolean;
  // Page Numbers
  numberPosition: "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right";
  numberFormat: "number" | "page_of_total" | "page_n" | "page_n_of_total";
  startNumber: string;
  fontName: "helv" | "tiro" | "cour";
  fontSize: string;
  color: string;
  // Watermark PDF
  watermarkMode: "text" | "image";
  watermarkText: string;
  watermarkPosition: "center" | "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "tile";
  watermarkOpacity: string;
  watermarkRotation: string;
  watermarkScale: string;
  watermarkImage: File | null;
  // OCR PDF
  ocrLanguage: string;
  ocrDpi: 150 | 200;
};

export const defaultOptions: ToolOptions = {
  splitMode: "ranges",
  ranges: "",
  interval: "1",
  separate: false,
  quality: "medium",
  angle: 90,
  pageMode: "all",
  pages: "",
  dpi: 150,
  pageSize: "fit",
  orientation: "portrait",
  margin: "small",
  slideMode: "editable",
  pdfaLevel: "2b",
  htmlSource: "file",
  htmlUrl: "",
  password: "",
  ownerPassword: "",
  allowPrint: true,
  allowCopy: true,
  allowModify: false,
  unlockAuthorized: false,
  numberPosition: "bottom-center",
  numberFormat: "page_n_of_total",
  startNumber: "1",
  fontName: "helv",
  fontSize: "11",
  color: "#334155",
  watermarkMode: "text",
  watermarkText: "CONFIDENTIAL",
  watermarkPosition: "center",
  watermarkOpacity: "0.25",
  watermarkRotation: "-45",
  watermarkScale: "0.35",
  watermarkImage: null,
  ocrLanguage: "eng",
  ocrDpi: 150,
};

const PAGE_TOKEN = /^\d+(-\d+)?$/;

const CONTENT_SLUGS = new Set([
  "jpg-to-pdf",
  "pdf-to-word",
  "word-to-pdf",
  "pdf-to-excel",
  "excel-to-pdf",
  "pdf-to-powerpoint",
  "powerpoint-to-pdf",
  "html-to-pdf",
  "pdf-to-pdfa",
]);

export function unsupportedFileMessage(name: string, tool: ToolDefinition): string {
  if (tool.slug === "jpg-to-pdf") {
    return `“${name}” isn't a JPG or JPEG file. Only .jpg and .jpeg images can be added.`;
  }
  if (tool.slug === "word-to-pdf") {
    return `“${name}” isn't a Word file. Only .doc and .docx documents can be added.`;
  }
  if (tool.slug === "excel-to-pdf") {
    return `“${name}” isn't an Excel file. Only .xls and .xlsx spreadsheets can be added.`;
  }
  if (tool.slug === "powerpoint-to-pdf") {
    return `“${name}” isn't a PowerPoint file. Only .ppt and .pptx decks can be added.`;
  }
  if (tool.slug === "html-to-pdf") {
    return `“${name}” isn't an HTML file. Only .html and .htm files can be added.`;
  }
  if (tool.accept.includes("application/pdf") || tool.accept.includes(".pdf")) {
    return `“${name}” isn't a PDF.`;
  }
  return `“${name}” isn't a ${tool.acceptLabel} file.`;
}

export function fileCap(tool: ToolDefinition, limits: Limits): number {
  return Math.min(tool.maxFiles, limits.max_files);
}

function readHead(file: File, bytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error("unreadable file"));
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

function startsWith(head: Uint8Array, magic: number[]): boolean {
  return magic.every((value, index) => head[index] === value);
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];

export function isJpegFile(file: File): Promise<boolean> {
  return readHead(file, 3).then((head) => head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff);
}

export function needsContentCheck(slug: string): boolean {
  return CONTENT_SLUGS.has(slug);
}

export async function matchesContent(file: File, slug: string): Promise<boolean> {
  if (slug === "jpg-to-pdf") return isJpegFile(file);
  const head = await readHead(file, slug === "html-to-pdf" ? 512 : 8);
  const name = file.name.toLowerCase();
  if (slug === "pdf-to-word" || slug === "pdf-to-excel" || slug === "pdf-to-powerpoint" || slug === "pdf-to-pdfa") {
    return startsWith(head, PDF_MAGIC);
  }
  if (slug === "word-to-pdf") {
    return name.endsWith(".docx") ? startsWith(head, ZIP_MAGIC) : name.endsWith(".doc") && startsWith(head, OLE_MAGIC);
  }
  if (slug === "excel-to-pdf") {
    return name.endsWith(".xlsx") ? startsWith(head, ZIP_MAGIC) : name.endsWith(".xls") && startsWith(head, OLE_MAGIC);
  }
  if (slug === "powerpoint-to-pdf") {
    return name.endsWith(".pptx") ? startsWith(head, ZIP_MAGIC) : name.endsWith(".ppt") && startsWith(head, OLE_MAGIC);
  }
  if (slug === "html-to-pdf") return looksLikeHtml(head);
  return true;
}

function looksLikeHtml(head: Uint8Array): boolean {
  if (
    startsWith(head, PDF_MAGIC) ||
    startsWith(head, ZIP_MAGIC) ||
    startsWith(head, OLE_MAGIC) ||
    startsWith(head, [0xff, 0xd8, 0xff]) ||
    startsWith(head, [0x89, 0x50, 0x4e, 0x47])
  ) {
    return false;
  }
  if (head.includes(0)) return false;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(head).toLowerCase();
  return text.includes("<");
}

export function matchesAccept(file: File, accept: string[]): boolean {
  const type = file.type.toLowerCase();
  if (type && accept.includes(type)) return true;
  const name = file.name.toLowerCase();
  if ((accept.includes("application/pdf") || accept.includes(".pdf")) && name.endsWith(".pdf")) return true;
  if (accept.includes("image/jpeg") && (type === "image/jpg" || type === "image/pjpeg" || /\.jpe?g$/.test(name))) {
    return true;
  }
  if (accept.includes("image/png") && name.endsWith(".png")) return true;
  const extension = name.match(/\.[a-z0-9]+$/)?.[0] ?? "";
  return Boolean(extension && accept.includes(extension));
}

export function validateHtmlUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a web address, including https://.";
  if (trimmed.length > 2000 || /[\s\\]/.test(trimmed)) return "Enter a public http or https address.";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Enter a full web address, such as https://example.com.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Only http and https addresses can be converted.";
  if (url.username || url.password) return "That address isn't allowed.";
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return "That address isn't allowed.";
  }
  if (host === "metadata.google.internal" || isBlockedAddress(host)) return "That address isn't allowed.";
  return null;
}

function isBlockedAddress(host: string): boolean {
  if (/^\d+$/.test(host)) {
    const value = Number(host);
    if (Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff) {
      host = `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
    }
  }
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd");
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 240) return true;
  return false;
}

export function validatePageList(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return "Enter at least one page, such as 1-3 or 1,4,7-9.";
  if (cleaned.length > 2000) return "That page list is too long.";
  const parts = cleaned.split(",").map((part) => part.trim());
  if (parts.some((part) => part === "")) {
    return "There's an empty entry in the page list. Use a format like 1-3,5.";
  }
  for (const part of parts) {
    if (!PAGE_TOKEN.test(part)) {
      return `“${part}” isn't a valid page or range. Use numbers like 1-3,5.`;
    }
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (start < 1 || end < 1) return "Page numbers start at 1.";
      if (end < start) return `Range ${part} goes backwards. Put the smaller page first.`;
    } else if (Number(part) < 1) {
      return "Page numbers start at 1.";
    }
  }
  return null;
}

export function validateIncomingFiles(
  incoming: File[],
  current: File[],
  tool: ToolDefinition,
  limits: Limits,
): { accepted: File[]; error: string | null } {
  const max = fileCap(tool, limits);
  const maxBytes = limits.max_file_size_mb * 1024 * 1024;
  const maxTotal = limits.max_total_size_mb * 1024 * 1024;
  if (current.length >= max) {
    return { accepted: [], error: `You can add up to ${max} files.` };
  }
  const accepted: File[] = [];
  let error: string | null = null;
  let total = current.reduce((sum, file) => sum + file.size, 0);
  for (const file of incoming) {
    if (!matchesAccept(file, tool.accept)) {
      error ??= unsupportedFileMessage(file.name, tool);
      continue;
    }
    if (current.length + accepted.length >= max) {
      error ??= `You can add up to ${max} files.`;
      break;
    }
    if (file.size <= 0) {
      error ??= `“${file.name}” is empty.`;
      continue;
    }
    if (file.size > maxBytes) {
      error ??= `“${file.name}” is larger than the ${limits.max_file_size_mb} MB limit.`;
      continue;
    }
    if (total + file.size > maxTotal) {
      error ??= `Those files add up to more than ${limits.max_total_size_mb} MB.`;
      continue;
    }
    total += file.size;
    accepted.push(file);
  }
  return { accepted, error };
}

export function validateReady(files: File[], tool: ToolDefinition, limits: Limits, options?: ToolOptions): string | null {
  if (tool.slug === "html-to-pdf" && options?.htmlSource === "url") return null;
  if (files.length < tool.minFiles) return tool.minMessage;
  if (files.length > fileCap(tool, limits)) {
    return `You can add up to ${fileCap(tool, limits)} files.`;
  }
  const maxBytes = limits.max_file_size_mb * 1024 * 1024;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  for (const file of files) {
    if (!matchesAccept(file, tool.accept)) return unsupportedFileMessage(file.name, tool);
    if (file.size > maxBytes) {
      return `“${file.name}” is larger than the ${limits.max_file_size_mb} MB limit.`;
    }
  }
  if (total > limits.max_total_size_mb * 1024 * 1024) {
    return `Those files add up to more than ${limits.max_total_size_mb} MB.`;
  }
  return null;
}

export function validateOptions(tool: ToolDefinition, options: ToolOptions): string | null {
  if (tool.slug === "split-pdf" && options.splitMode === "ranges") {
    return validatePageList(options.ranges);
  }
  if (tool.slug === "split-pdf" && options.splitMode === "interval") {
    const interval = Number(options.interval);
    if (!Number.isInteger(interval) || interval < 1) return "The interval must be at least 1.";
  }
  if (
    (tool.slug === "rotate-pdf" ||
      tool.slug === "pdf-to-jpg" ||
      tool.slug === "page-numbers" ||
      tool.slug === "watermark-pdf" ||
      tool.slug === "ocr-pdf") &&
    options.pageMode === "custom"
  ) {
    return validatePageList(options.pages);
  }
  if (tool.slug === "html-to-pdf" && options.htmlSource === "url") {
    return validateHtmlUrl(options.htmlUrl);
  }
  if (tool.slug === "protect-pdf") {
    if (!options.password || options.password.length > 128) {
      return "Enter a password between 1 and 128 characters.";
    }
    if (options.ownerPassword.length > 128) {
      return "The owner password must be 128 characters or fewer.";
    }
  }
  if (tool.slug === "unlock-pdf") {
    if (!options.unlockAuthorized) {
      return "Confirm that you are authorized to remove the password from this PDF.";
    }
    if (!options.password || options.password.length > 128) {
      return "Enter the PDF password.";
    }
  }
  if (tool.slug === "page-numbers") {
    const start = Number(options.startNumber);
    if (!Number.isInteger(start) || start < 1 || start > 10000) {
      return "Starting number must be between 1 and 10000.";
    }
    const size = Number(options.fontSize);
    if (!Number.isInteger(size) || size < 8 || size > 36) {
      return "Font size must be between 8 and 36.";
    }
  }
  if (tool.slug === "watermark-pdf") {
    if (options.watermarkMode === "text") {
      const txt = options.watermarkText.trim();
      if (!txt || txt.length > 120) {
        return "Enter watermark text between 1 and 120 characters.";
      }
    } else if (!options.watermarkImage) {
      return "Upload a PNG or JPG watermark image.";
    }
  }
  return null;
}

export function appendOptions(form: FormData, tool: ToolDefinition, options: ToolOptions): void {
  if (tool.slug === "split-pdf") {
    form.set("mode", options.splitMode);
    form.set("ranges", options.ranges.trim());
    form.set("interval", options.interval.trim() || "1");
    form.set("separate", options.separate ? "true" : "false");
  }
  if (tool.slug === "compress-pdf") form.set("quality", options.quality);
  if (tool.slug === "rotate-pdf") {
    form.set("angle", String(options.angle));
    form.set("pages", options.pageMode === "all" ? "all" : options.pages.trim());
  }
  if (tool.slug === "pdf-to-jpg") {
    form.set("dpi", String(options.dpi));
    form.set("pages", options.pageMode === "all" ? "all" : options.pages.trim());
  }
  if (tool.slug === "jpg-to-pdf") {
    form.set("page_size", options.pageSize);
    form.set("orientation", options.orientation);
    form.set("margin", options.margin);
  }
  if (tool.slug === "pdf-to-powerpoint") form.set("mode", options.slideMode);
  if (tool.slug === "pdf-to-pdfa") form.set("level", options.pdfaLevel);
  if (tool.slug === "html-to-pdf") {
    form.set("source", options.htmlSource);
    form.set("url", options.htmlSource === "url" ? options.htmlUrl.trim() : "");
    form.set("page_size", options.pageSize === "letter" ? "letter" : "a4");
  }
  if (tool.slug === "protect-pdf") {
    form.set("user_password", options.password);
    form.set("owner_password", options.ownerPassword);
    form.set("allow_print", options.allowPrint ? "true" : "false");
    form.set("allow_copy", options.allowCopy ? "true" : "false");
    form.set("allow_modify", options.allowModify ? "true" : "false");
  }
  if (tool.slug === "unlock-pdf") {
    form.set("password", options.password);
    form.set("authorized", options.unlockAuthorized ? "true" : "false");
  }
  if (tool.slug === "page-numbers") {
    form.set("position", options.numberPosition);
    form.set("format", options.numberFormat);
    form.set("start_number", options.startNumber.trim() || "1");
    form.set("font", options.fontName);
    form.set("font_size", options.fontSize.trim() || "11");
    form.set("color", options.color);
    form.set("pages", options.pageMode === "all" ? "all" : options.pages.trim());
  }
  if (tool.slug === "watermark-pdf") {
    form.set("mode", options.watermarkMode);
    form.set("text", options.watermarkText.trim());
    form.set("font_size", options.fontSize.trim() || "48");
    form.set("color", options.color);
    form.set("opacity", options.watermarkOpacity);
    form.set("rotation", options.watermarkRotation);
    form.set("position", options.watermarkPosition);
    form.set("scale", options.watermarkScale);
    form.set("pages", options.pageMode === "all" ? "all" : options.pages.trim());
    if (options.watermarkMode === "image" && options.watermarkImage) {
      form.set("watermark_image", options.watermarkImage, options.watermarkImage.name);
    }
  }
  if (tool.slug === "ocr-pdf") {
    form.set("language", options.ocrLanguage);
    form.set("dpi", String(options.ocrDpi));
    form.set("pages", options.pageMode === "all" ? "all" : options.pages.trim());
  }
}
