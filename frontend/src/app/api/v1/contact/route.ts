import { createHash } from "node:crypto";
import { validateContactInput } from "@/lib/contact";
import { NO_STORE, apiError } from "@/lib/converter";
import { getDb } from "@/lib/db";
import { sendContactEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_JSON_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function clientIpHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = firstForwarded || realIp || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return apiError(400, "invalid_input", "Send the contact form as JSON.");
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    return apiError(413, "payload_too_large", "The submission is too large.");
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return apiError(400, "invalid_input", "Could not read the request body.");
  }

  if (Buffer.byteLength(rawText, "utf8") > MAX_JSON_BYTES) {
    return apiError(413, "payload_too_large", "The submission is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return apiError(400, "invalid_input", "Invalid JSON payload.");
  }

  const validated = validateContactInput(body);
  if (!validated.ok) {
    return Response.json(
      { error: { code: validated.code, message: validated.message, field: validated.field } },
      { status: 400, headers: NO_STORE },
    );
  }

  const ipHash = clientIpHash(request);
  try {
    const db = await getDb();
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await db.contactMessage.count({
      where: {
        ipHash,
        createdAt: { gte: windowStart },
      },
    });

    if (recentCount >= RATE_LIMIT_MAX_REQUESTS) {
      return apiError(
        429,
        "rate_limited",
        "Too many messages sent recently. Please wait 15 minutes before trying again.",
      );
    }

    const record = await db.contactMessage.create({
      data: {
        name: validated.data.name,
        email: validated.data.email,
        subject: validated.data.subject,
        message: validated.data.message,
        ipHash,
      },
    });

    const mail = await sendContactEmail({
      id: record.id,
      name: validated.data.name,
      email: validated.data.email,
      subject: validated.data.subject,
      message: validated.data.message,
    });

    return Response.json(
      {
        ok: true,
        id: record.id,
        emailed: mail.sent,
        message: "Thank you for contacting BestConvert. Your message has been received.",
      },
      { status: 201, headers: NO_STORE },
    );
  } catch {
    return apiError(
      500,
      "server_error",
      "We couldn't save your message right now. Please try again in a minute.",
    );
  }
}
