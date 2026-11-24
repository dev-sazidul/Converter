import {
  NO_STORE,
  apiError,
  converterHeaders,
  converterUnavailable,
  converterUrl,
  limitBody,
  maxRequestBytes,
  readJson,
} from "@/lib/converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return apiError(400, "invalid_option", "Send the PDF as a form upload.");
  }

  const limit = maxRequestBytes();
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) {
    return apiError(413, "file_too_large", `That upload is larger than ${Math.round(limit / 1024 / 1024)} MB.`);
  }

  let overLimit = false;
  const body = request.body
    ? limitBody(request.body, limit, () => {
        overLimit = true;
      })
    : null;

  let upstream: Response;
  try {
    upstream = await fetch(converterUrl("/api/v1/tools/preview"), {
      method: "POST",
      headers: converterHeaders({ "Content-Type": contentType }),
      body,
      duplex: "half",
      signal: request.signal,
      cache: "no-store",
    } as RequestInit & { duplex: "half" });
  } catch {
    if (overLimit) {
      return apiError(413, "file_too_large", `That upload is larger than ${Math.round(limit / 1024 / 1024)} MB.`);
    }
    if (request.signal.aborted) {
      return apiError(400, "aborted", "The preview request was cancelled.");
    }
    return converterUnavailable();
  }

  const result = await readJson(upstream);
  if (!upstream.ok || !result || typeof result !== "object") {
    return Response.json(
      result && typeof result === "object"
        ? result
        : { error: { code: "processing_failed", message: "We couldn't preview that PDF." } },
      { status: upstream.ok ? 502 : upstream.status, headers: NO_STORE },
    );
  }

  return Response.json(result, { headers: NO_STORE });
}
