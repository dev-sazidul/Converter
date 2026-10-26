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
};

const PAGE_TOKEN = /^\d+(-\d+)?$/;

export function fileCap(tool: ToolDefinition, limits: Limits): number {
  return Math.min(tool.maxFiles, limits.max_files);
}

export function matchesAccept(file: File, accept: string[]): boolean {
  const type = file.type.toLowerCase();
  if (type && accept.includes(type)) return true;
  const name = file.name.toLowerCase();
  if (accept.includes("application/pdf") && name.endsWith(".pdf")) return true;
  if (accept.includes("image/jpeg") && /\.jpe?g$/.test(name)) return true;
  if (accept.includes("image/png") && name.endsWith(".png")) return true;
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
    if (current.length + accepted.length >= max) {
      error ??= `You can add up to ${max} files.`;
      break;
    }
    if (!matchesAccept(file, tool.accept)) {
      error ??= `“${file.name}” isn't a ${tool.acceptLabel} file.`;
      continue;
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

export function validateReady(files: File[], tool: ToolDefinition, limits: Limits): string | null {
  if (files.length < tool.minFiles) return tool.minMessage;
  if (files.length > fileCap(tool, limits)) {
    return `You can add up to ${fileCap(tool, limits)} files.`;
  }
  const maxBytes = limits.max_file_size_mb * 1024 * 1024;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  for (const file of files) {
    if (!matchesAccept(file, tool.accept)) return `“${file.name}” isn't a ${tool.acceptLabel} file.`;
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
  if ((tool.slug === "rotate-pdf" || tool.slug === "pdf-to-jpg") && options.pageMode === "custom") {
    return validatePageList(options.pages);
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
}
