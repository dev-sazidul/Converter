export type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
  formStartedAt?: number;
};

export type ContactValidationResult =
  | {
      ok: true;
      data: {
        name: string;
        email: string;
        subject: string;
        message: string;
      };
    }
  | {
      ok: false;
      code: "invalid_input" | "spam_detected";
      message: string;
      field?: "name" | "email" | "subject" | "message";
    };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARS_SINGLE_LINE = /[\x00-\x1f\x7f]/g;
const CONTROL_CHARS_MULTILINE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const URL_REGEX = /https?:\/\/|www\./gi;

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  subjectMin: 3,
  subjectMax: 120,
  messageMin: 10,
  messageMax: 3000,
  maxUrlsInMessage: 5,
  minFormFillMs: 1200,
} as const;

export function sanitizeSingleLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS_SINGLE_LINE, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS_MULTILINE, "")
    .trim();
}

export function validateContactInput(
  raw: unknown,
  nowMs: number = Date.now(),
): ContactValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "invalid_input", message: "Please fill out the contact form." };
  }

  const body = raw as Record<string, unknown>;

  // Honeypot field must remain empty.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return {
      ok: false,
      code: "spam_detected",
      message: "Your message could not be submitted. Please try again.",
    };
  }

  // Optional timing check when submitted from the browser UI.
  if (typeof body.formStartedAt === "number" && Number.isFinite(body.formStartedAt)) {
    const elapsed = nowMs - body.formStartedAt;
    if (elapsed >= 0 && elapsed < CONTACT_LIMITS.minFormFillMs) {
      return {
        ok: false,
        code: "spam_detected",
        message: "Please take a moment before submitting the form.",
      };
    }
  }

  const name = sanitizeSingleLine(body.name);
  if (name.length < CONTACT_LIMITS.nameMin || name.length > CONTACT_LIMITS.nameMax) {
    return {
      ok: false,
      code: "invalid_input",
      field: "name",
      message: `Please enter your name (${CONTACT_LIMITS.nameMin}–${CONTACT_LIMITS.nameMax} characters).`,
    };
  }

  const email = sanitizeSingleLine(body.email).toLowerCase();
  if (
    email.length === 0 ||
    email.length > CONTACT_LIMITS.emailMax ||
    !EMAIL_REGEX.test(email)
  ) {
    return {
      ok: false,
      code: "invalid_input",
      field: "email",
      message: "Please enter a valid email address.",
    };
  }

  const subject = sanitizeSingleLine(body.subject);
  if (subject.length < CONTACT_LIMITS.subjectMin || subject.length > CONTACT_LIMITS.subjectMax) {
    return {
      ok: false,
      code: "invalid_input",
      field: "subject",
      message: `Please enter a subject (${CONTACT_LIMITS.subjectMin}–${CONTACT_LIMITS.subjectMax} characters).`,
    };
  }

  const message = sanitizeMultiline(body.message);
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    return {
      ok: false,
      code: "invalid_input",
      field: "message",
      message: `Please enter a message (${CONTACT_LIMITS.messageMin}–${CONTACT_LIMITS.messageMax} characters).`,
    };
  }

  const urls = message.match(URL_REGEX);
  if (urls && urls.length > CONTACT_LIMITS.maxUrlsInMessage) {
    return {
      ok: false,
      code: "spam_detected",
      field: "message",
      message: "Please reduce the number of links in your message.",
    };
  }

  return {
    ok: true,
    data: { name, email, subject, message },
  };
}
