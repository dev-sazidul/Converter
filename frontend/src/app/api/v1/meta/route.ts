import { NO_STORE, converterHeaders, converterUnavailable, converterUrl, readJson } from "@/lib/converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upload limits and the tool list, as configured on the converter. */
export async function GET(): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(converterUrl("/api/v1/meta"), { headers: converterHeaders(), cache: "no-store" });
  } catch {
    return converterUnavailable();
  }
  if (!upstream.ok) return converterUnavailable();
  return Response.json(await readJson(upstream), { headers: NO_STORE });
}
