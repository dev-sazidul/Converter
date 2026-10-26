import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "@/lib/api";
import { defaultLimits } from "@/lib/api";
import { validateIncomingFiles, validatePageList, validateReady } from "@/lib/files";
import { availableTools, getTool, tools } from "@/lib/tools";
import { POPUP_INTERVAL_MS, popupCreatives } from "@/lib/ads";
import { formatBytes } from "@/lib/utils";

describe("ads", () => {
  it("brings the popup back 20 seconds after it closes", () => {
    expect(POPUP_INTERVAL_MS).toBe(20_000);
    expect(popupCreatives.length).toBeGreaterThan(0);
    expect(popupCreatives.some((creative) => creative.kind === "video")).toBe(true);
  });
});

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });
});

describe("tool registry", () => {
  it("publishes six working tools with endpoints and unique urls", () => {
    const ready = availableTools();
    expect(ready).toHaveLength(6);
    expect(new Set(tools.map((tool) => tool.slug)).size).toBe(tools.length);
    expect(ready.every((tool) => tool.endpoint?.startsWith("/api/v1/tools/"))).toBe(true);
    expect(tools.filter((tool) => tool.status === "soon").every((tool) => !tool.endpoint)).toBe(true);
    expect(getTool("merge-pdf")?.minFiles).toBe(2);
    expect(getTool("not-a-tool")).toBeUndefined();
  });
});

describe("file checks", () => {
  const merge = getTool("merge-pdf");
  if (!merge) throw new Error("missing merge tool");

  it("rejects the wrong type and oversized files", () => {
    const good = new File(["%PDF"], "a.pdf", { type: "application/pdf" });
    const text = new File(["hello"], "notes.txt", { type: "text/plain" });
    const huge = new File([new Uint8Array(8)], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(huge, "size", { value: 30 * 1024 * 1024 });
    const result = validateIncomingFiles([good, text, huge], [], merge, defaultLimits);
    expect(result.accepted).toHaveLength(1);
    expect(result.error).toMatch(/isn't a PDF|larger than/);
  });

  it("requires two files before merge", () => {
    const one = new File(["%PDF"], "a.pdf", { type: "application/pdf" });
    expect(validateReady([one], merge, defaultLimits)).toMatch(/two/i);
    expect(validateReady([one, one], merge, defaultLimits)).toBeNull();
  });
});

describe("page lists", () => {
  it("accepts ranges and rejects empty or backwards values", () => {
    expect(validatePageList("1-3,5")).toBeNull();
    expect(validatePageList("")).toMatch(/at least one page/i);
    expect(validatePageList("3-1")).toMatch(/backwards/i);
    expect(validatePageList("abc")).toMatch(/isn't a valid page/i);
  });
});

describe("api errors", () => {
  it("reads the server message and hides empty bodies", () => {
    const parsed = toApiError(400, { error: { code: "invalid_pdf", message: "This file isn't a valid PDF." } });
    expect(parsed).toBeInstanceOf(ApiError);
    expect(parsed.code).toBe("invalid_pdf");
    expect(parsed.message).toMatch(/valid PDF/);
    expect(toApiError(500, null).message).toMatch(/try again/i);
    expect(toApiError(0, null).code).toBe("network_error");
  });
});
