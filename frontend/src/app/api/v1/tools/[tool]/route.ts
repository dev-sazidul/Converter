import { getDb } from "@/lib/db";
import {
  NO_STORE,
  apiError,
  converterHeaders,
  converterTools,
  converterUnavailable,
  converterUrl,
  errorCode,
  isConverterJob,
  limitBody,
  maxRequestBytes,
  readJson,
} from "@/lib/converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run a tool. The upload is streamed to the converter as it arrives, never held in memory here.
 * Login and quota checks go here before the upload is forwarded.
 */
export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }): Promise<Response> {
  const { tool } = await params;
  if (!converterTools.has(tool)) {
    return apiError(404, "not_found", "That tool doesn't exist.");
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return apiError(400, "invalid_option", "Send the files as a form upload.");
  }
  const limit = maxRequestBytes();
  const tooLarge = () =>
    apiError(413, "file_too_large", `That upload is larger than ${Math.round(limit / 1024 / 1024)} MB.`);
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return tooLarge();

  const db = await getDb();
  const job = await db.job.create({ data: { tool } });
  const fail = (code: string) =>
    db.job.update({ where: { id: job.id }, data: { status: "failed", errorCode: code, finishedAt: new Date() } });

  let overLimit = false;
  const body = request.body
    ? limitBody(request.body, limit, () => {
        overLimit = true;
      })
    : null;

  let upstream: Response;
  try {
    upstream = await fetch(converterUrl(`/api/v1/tools/${tool}`), {
      method: "POST",
      headers: converterHeaders({ "Content-Type": contentType }),
      body,
      // Required by Node's fetch to send a stream as the request body.
      duplex: "half",
      signal: request.signal,
      cache: "no-store",
    } as RequestInit & { duplex: "half" });
  } catch {
    if (overLimit) {
      await fail("file_too_large");
      return tooLarge();
    }
    if (request.signal.aborted) {
      await fail("aborted");
      return apiError(400, "aborted", "The upload was cancelled.");
    }
    await fail("converter_unavailable");
    return converterUnavailable();
  }

  const result = await readJson(upstream);
  if (!upstream.ok || !isConverterJob(result)) {
    const code = errorCode(result);
    await fail(code ?? "processing_failed");
    if (code) return Response.json(result, { status: upstream.status, headers: NO_STORE });
    return apiError(upstream.ok ? 502 : upstream.status, "processing_failed", "We couldn't process that file. Please try again.");
  }

  const finishedAt = new Date();
  const inputBytes = result.meta.input_bytes;
  await db.job.update({
    where: { id: job.id },
    data: {
      status: "ready",
      converterJobId: result.job_id,
      filename: result.filename,
      mediaType: result.media_type,
      inputBytes: typeof inputBytes === "number" ? inputBytes : null,
      outputBytes: result.size_bytes,
      finishedAt,
      expiresAt: new Date(finishedAt.getTime() + result.expires_in_seconds * 1000),
    },
  });

  return Response.json(
    { ...result, job_id: job.id, download_url: `/api/v1/jobs/${job.id}/download` },
    { headers: NO_STORE },
  );
}
