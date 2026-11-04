// Server code only. Talks to the Python converter over the private network.
// The browser never sees CONVERTER_URL, CONVERTER_TOKEN, or the converter's job ids.

import { availableTools } from "@/lib/tools";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Converter tool names, such as "merge", taken from the endpoints in the tool registry. */
export const converterTools: ReadonlySet<string> = new Set(
  availableTools().flatMap((tool) => (tool.endpoint ? [tool.endpoint.split("/").pop() ?? ""] : [])),
);

export function converterUrl(path: string): string {
  const base = (process.env.CONVERTER_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  return `${base}${path}`;
}

export function converterHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = process.env.CONVERTER_TOKEN?.trim();
  if (token) headers.set("X-Converter-Token", token);
  return headers;
}

/** Largest request body forwarded to the converter. The converter checks each file again. */
export function maxRequestBytes(): number {
  const megabytes = Number(process.env.MAX_REQUEST_MB);
  return (Number.isFinite(megabytes) && megabytes > 0 ? megabytes : 120) * 1024 * 1024;
}

/**
 * Pass `body` through, but fail the stream once more than `max` bytes have gone by.
 * The converter only checks sizes after the whole upload has arrived, so without this
 * a single request could fill its disk.
 */
export function limitBody(
  body: ReadableStream<Uint8Array>,
  max: number,
  onLimit: () => void,
): ReadableStream<Uint8Array> {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > max) {
          onLimit();
          controller.error(new Error("request body too large"));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

export function isJobId(value: string): boolean {
  return JOB_ID.test(value);
}

export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: NO_STORE });
}

export function converterUnavailable(): Response {
  return apiError(503, "converter_unavailable", "The converter isn't reachable right now. Try again in a minute.");
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function errorCode(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const error = (body as { error?: { code?: unknown } }).error;
  return typeof error?.code === "string" ? error.code : null;
}

/** The success body of a converter tool call. */
export type ConverterJob = {
  job_id: string;
  filename: string;
  media_type: string;
  size_bytes: number;
  download_url: string;
  expires_in_seconds: number;
  meta: Record<string, string | number>;
};

export function isConverterJob(body: unknown): body is ConverterJob {
  if (!body || typeof body !== "object") return false;
  const job = body as Record<string, unknown>;
  return (
    typeof job.job_id === "string" &&
    isJobId(job.job_id) &&
    typeof job.filename === "string" &&
    typeof job.media_type === "string" &&
    typeof job.size_bytes === "number" &&
    typeof job.expires_in_seconds === "number" &&
    typeof job.meta === "object" &&
    job.meta !== null
  );
}
