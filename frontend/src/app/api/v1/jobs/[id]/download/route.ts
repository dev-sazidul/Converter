import { getDb } from "@/lib/db";
import { NO_STORE, apiError, converterHeaders, converterUnavailable, converterUrl, isJobId } from "@/lib/converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASSED_HEADERS = ["content-type", "content-length", "content-disposition"];

function gone(): Response {
  return apiError(404, "not_found", "That download is no longer available. Process the file again.");
}

/** Stream a finished file from the converter. Later, check here that the job belongs to the user. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  if (!isJobId(id)) return gone();
  const db = await getDb();
  const job = await db.job.findUnique({ where: { id } });
  if (!job || job.status !== "ready" || !job.converterJobId || !job.expiresAt) return gone();
  const markExpired = () => db.job.update({ where: { id }, data: { status: "expired" } });
  if (job.expiresAt.getTime() <= Date.now()) {
    await markExpired();
    return gone();
  }

  let upstream: Response;
  try {
    upstream = await fetch(converterUrl(`/api/v1/jobs/${job.converterJobId}/download`), {
      headers: converterHeaders(),
      cache: "no-store",
    });
  } catch {
    return converterUnavailable();
  }
  if (!upstream.ok || !upstream.body) {
    if (upstream.status === 404) await markExpired();
    return gone();
  }

  const headers = new Headers(NO_STORE);
  for (const name of PASSED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: 200, headers });
}
