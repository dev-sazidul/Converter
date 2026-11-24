import path from "node:path";
import { describe, expect, it } from "vitest";
import { converterTools, errorCode, isConverterJob, isJobId, limitBody, maxRequestBytes } from "@/lib/converter";
import { DEFAULT_DATABASE_URL, databaseUrl, sqliteFile } from "@/lib/database-url";

describe("databaseUrl", () => {
  const base = path.resolve("/srv/app");

  it("makes relative SQLite paths absolute so the CLI and the app open one file", () => {
    const url = databaseUrl("file:./data/app.db", base);
    expect(url).toBe(`file:${path.join(base, "data", "app.db").split(path.sep).join("/")}`);
    expect(path.isAbsolute(sqliteFile(url) ?? "")).toBe(true);
  });

  it("uses the default file when DATABASE_URL is empty", () => {
    expect(databaseUrl("", base)).toBe(databaseUrl(DEFAULT_DATABASE_URL, base));
    expect(databaseUrl(undefined, base)).toBe(databaseUrl(DEFAULT_DATABASE_URL, base));
  });

  it("keeps absolute paths and non-SQLite URLs", () => {
    expect(databaseUrl("file:/data/db/app.db", base)).toBe("file:/data/db/app.db");
    expect(databaseUrl("postgresql://user@db:5432/convarter", base)).toBe("postgresql://user@db:5432/convarter");
    expect(sqliteFile("postgresql://db")).toBeNull();
  });
});

describe("limitBody", () => {
  function streamOf(...chunks: number[]): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        for (const size of chunks) controller.enqueue(new Uint8Array(size));
        controller.close();
      },
    });
  }

  async function drain(stream: ReadableStream<Uint8Array>): Promise<number> {
    let total = 0;
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return total;
      total += value.byteLength;
    }
  }

  it("passes bodies within the limit through unchanged", async () => {
    let hit = false;
    expect(await drain(limitBody(streamOf(400, 600), 1000, () => (hit = true)))).toBe(1000);
    expect(hit).toBe(false);
  });

  it("fails the stream once the limit is passed", async () => {
    let hit = false;
    await expect(drain(limitBody(streamOf(600, 600, 600), 1000, () => (hit = true)))).rejects.toThrow("too large");
    expect(hit).toBe(true);
  });

  it("reads the limit from MAX_REQUEST_MB with a 120 MB default", () => {
    const previous = process.env.MAX_REQUEST_MB;
    process.env.MAX_REQUEST_MB = "5";
    expect(maxRequestBytes()).toBe(5 * 1024 * 1024);
    process.env.MAX_REQUEST_MB = "nonsense";
    expect(maxRequestBytes()).toBe(120 * 1024 * 1024);
    if (previous === undefined) delete process.env.MAX_REQUEST_MB;
    else process.env.MAX_REQUEST_MB = previous;
  });
});

describe("converter helpers", () => {
  it("allows exactly the converter tools behind available tools", () => {
    expect(converterTools.size).toBe(22);
    for (const name of [
      "merge",
      "split",
      "pdf-to-jpg",
      "html-to-pdf",
      "pdf-to-pdfa",
      "edit",
      "watermark",
      "page-numbers",
      "repair",
      "ocr",
      "protect",
      "unlock",
      "sign",
    ]) {
      expect(converterTools.has(name)).toBe(true);
    }
    expect(converterTools.has("..")).toBe(false);
  });

  it("accepts only well-formed job ids", () => {
    expect(isJobId("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isJobId("../../etc/passwd")).toBe(false);
    expect(isJobId("11111111-1111-1111-1111-111111111111/../x")).toBe(false);
  });

  it("recognises converter job and error bodies", () => {
    const job = {
      job_id: "11111111-1111-1111-1111-111111111111",
      filename: "a.pdf",
      media_type: "application/pdf",
      size_bytes: 10,
      download_url: "/api/v1/jobs/x/download",
      expires_in_seconds: 60,
      meta: {},
    };
    expect(isConverterJob(job)).toBe(true);
    expect(isConverterJob({ ...job, job_id: "nope" })).toBe(false);
    expect(errorCode({ error: { code: "busy", message: "Busy" } })).toBe("busy");
    expect(errorCode({ detail: "x" })).toBeNull();
  });
});
