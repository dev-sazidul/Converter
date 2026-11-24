import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

export type ContactEmailPayload = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function readSmtpConfig(): SmtpConfig | null {
  const host = (process.env.SMTP_HOST ?? "").trim();
  const user = (process.env.SMTP_USER ?? "").trim();
  const pass = (process.env.SMTP_PASS ?? "").trim();
  const to = (process.env.CONTACT_TO_EMAIL ?? "").trim();
  if (!host || !user || !pass || !to) return null;

  const portNum = Number(process.env.SMTP_PORT);
  const port = Number.isInteger(portNum) && portNum > 0 && portNum <= 65535 ? portNum : 587;
  const secure = (process.env.SMTP_SECURE ?? "").trim().toLowerCase() === "true" || port === 465;
  const from = (process.env.CONTACT_FROM_EMAIL ?? "").trim() || user;

  return { host, port, secure, user, pass, from, to };
}

export async function sendContactEmail(
  payload: ContactEmailPayload,
): Promise<{ sent: boolean; reason?: "not_configured" | "send_failed" }> {
  const config = readSmtpConfig();
  if (!config) {
    return { sent: false, reason: "not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  const textBody = [
    "New BestConvert Contact Form Submission",
    `Reference ID: ${payload.id}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Subject: ${payload.subject}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: config.from,
      to: config.to,
      replyTo: payload.email,
      subject: `[BestConvert Contact] ${payload.subject}`,
      text: textBody,
    });
    return { sent: true };
  } catch {
    return { sent: false, reason: "send_failed" };
  }
}
