import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "@/lib/api";
import { defaultLimits } from "@/lib/api";
import { isJpegFile, matchesContent, validateHtmlUrl, validateIncomingFiles, validatePageList, validateReady } from "@/lib/files";
import { availableTools, getTool, tools } from "@/lib/tools";
import { adsenseClient, adsenseSlotId } from "@/lib/ads";
import { formatBytes } from "@/lib/utils";

describe("ads", () => {
  it("keeps the AdSense client and slot configuration", () => {
    expect(adsenseClient()).toBe("ca-pub-5871594289590523");
    expect(adsenseSlotId("content")).toBe((process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? "").trim());
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
  it("publishes the working tools with endpoints and unique urls", () => {
    const ready = availableTools();
    expect(ready).toHaveLength(22);
    expect(ready.map((tool) => tool.slug)).toEqual(
      expect.arrayContaining([
        "pdf-to-word",
        "word-to-pdf",
        "pdf-to-excel",
        "excel-to-pdf",
        "pdf-to-powerpoint",
        "powerpoint-to-pdf",
        "html-to-pdf",
        "pdf-to-pdfa",
      ]),
    );
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

  it("rejects PNG files on JPG to PDF", async () => {
    const jpgTool = getTool("jpg-to-pdf");
    if (!jpgTool) throw new Error("missing jpg tool");
    const jpg = new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" });
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], "scan.JPEG", { type: "" });
    const png = new File([new Uint8Array([0x89, 0x50])], "diagram.png", { type: "image/png" });
    const result = validateIncomingFiles([jpg, jpeg, png], [], jpgTool, defaultLimits);
    expect(result.accepted.map((file) => file.name)).toEqual(["photo.jpg", "scan.JPEG"]);
    expect(result.error).toBe("“diagram.png” isn't a JPG or JPEG file. Only .jpg and .jpeg images can be added.");
    const renamed = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "photo.jpg", { type: "image/jpeg" });
    expect(await isJpegFile(jpg)).toBe(true);
    expect(await isJpegFile(renamed)).toBe(false);
  });

  it("rejects the wrong document type for Word, Excel, PowerPoint, and HTML", async () => {
    const word = getTool("word-to-pdf");
    const excel = getTool("excel-to-pdf");
    const slides = getTool("powerpoint-to-pdf");
    const html = getTool("html-to-pdf");
    const pdfa = getTool("pdf-to-pdfa");
    if (!word || !excel || !slides || !html || !pdfa) throw new Error("missing conversion tool");
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "diagram.png", { type: "image/png" });
    const renamed = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], "notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const docx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "notes.docx", { type: "" });
    const rejected = validateIncomingFiles([png, renamed], [], word, defaultLimits);
    expect(rejected.accepted.map((file) => file.name)).toEqual(["notes.docx"]);
    expect(rejected.error).toMatch(/Word file/);
    expect(await matchesContent(docx, "word-to-pdf")).toBe(true);
    expect(await matchesContent(renamed, "word-to-pdf")).toBe(false);
    const sheet = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "book.xlsx", { type: "" });
    expect((await validateIncomingFiles([sheet], [], excel, defaultLimits)).accepted).toHaveLength(1);
    const deck = new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])], "deck.ppt", { type: "" });
    expect(await matchesContent(deck, "powerpoint-to-pdf")).toBe(true);
    const page = new File(["<p>Hello</p>"], "page.html", { type: "text/html" });
    const fakeHtml = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "page.html", { type: "text/html" });
    const htmlResult = validateIncomingFiles([page, png], [], html, defaultLimits);
    expect(htmlResult.accepted.map((file) => file.name)).toEqual(["page.html"]);
    expect(htmlResult.error).toMatch(/HTML file/);
    expect(await matchesContent(page, "html-to-pdf")).toBe(true);
    expect(await matchesContent(fakeHtml, "html-to-pdf")).toBe(false);
    const notPdf = new File(["hello"], "notes.pdf", { type: "application/pdf" });
    expect(await matchesContent(notPdf, "pdf-to-pdfa")).toBe(false);
    expect(validateHtmlUrl("http://127.0.0.1/secret")).toMatch(/isn't allowed/);
    expect(validateHtmlUrl("file:///etc/passwd")).toMatch(/http and https/);
    expect(validateHtmlUrl("https://example.com/docs")).toBeNull();
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
