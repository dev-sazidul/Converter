import { getDb } from "@/lib/db";
import { NO_STORE, converterUrl } from "@/lib/converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Full health check: the database answers and the converter can write to its storage.
 * Use it to check a deploy. The container health check uses /healthz, which does not
 * depend on the converter.
 */
export async function GET(): Promise<Response> {
  const checks = { database: false, converter: false };
  try {
    const db = await getDb();
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    // Reported below.
  }
  try {
    const response = await fetch(converterUrl("/api/health"), { cache: "no-store", signal: AbortSignal.timeout(5000) });
    checks.converter = response.ok;
  } catch {
    // Reported below.
  }
  const ok = checks.database && checks.converter;
  return Response.json({ status: ok ? "ok" : "unavailable", checks }, { status: ok ? 200 : 503, headers: NO_STORE });
}
