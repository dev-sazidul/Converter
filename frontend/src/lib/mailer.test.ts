import { afterEach, describe, expect, it } from "vitest";
import { readSmtpConfig, sendContactEmail } from "@/lib/mailer";

describe("mailer", () => {
  const envKeys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "CONTACT_FROM_EMAIL",
    "CONTACT_TO_EMAIL",
  ] as const;

  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("returns null config when SMTP env vars are missing", () => {
    expect(readSmtpConfig()).toBeNull();
  });

  it("reads valid SMTP config and defaults from to SMTP_USER", () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@gmail.com";
    process.env.SMTP_PASS = "secret";
    process.env.CONTACT_TO_EMAIL = "inbox@gmail.com";

    const cfg = readSmtpConfig();
    expect(cfg).toEqual({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: "user@gmail.com",
      pass: "secret",
      from: "user@gmail.com",
      to: "inbox@gmail.com",
    });
  });

  it("gracefully skips sending when SMTP is not configured", async () => {
    const res = await sendContactEmail({
      id: "test-id",
      name: "Zara",
      email: "zara@example.com",
      subject: "Hello",
      message: "Testing contact mailer without SMTP env.",
    });
    expect(res).toEqual({ sent: false, reason: "not_configured" });
  });
});
