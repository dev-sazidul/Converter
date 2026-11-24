"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { CONTACT_LIMITS, validateContactInput } from "@/lib/contact";
import { cn, container, focusRing } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

const inputClass = cn(
  "mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70",
  focusRing,
);

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number>(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const payload = {
      name,
      email,
      subject,
      message,
      website,
      formStartedAt,
    };

    const clientCheck = validateContactInput(payload);
    if (!clientCheck.ok) {
      setStatus("error");
      setFeedback(clientCheck.message);
      return;
    }

    setStatus("submitting");
    setFeedback(null);

    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; id?: string; message?: string; error?: { message?: string } }
        | null;

      if (!response.ok || !body?.ok) {
        setStatus("error");
        setFeedback(
          body?.error?.message || "We couldn't send your message right now. Please try again.",
        );
        return;
      }

      setStatus("success");
      setFeedback(body.message || "Thank you for contacting BestConvert. Your message has been received.");
      setReferenceId(body.id ?? null);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setWebsite("");
      setFormStartedAt(Date.now());
    } catch {
      setStatus("error");
      setFeedback("Network error while sending your message. Check your connection and try again.");
    }
  }

  return (
    <div className={`${container} py-10 sm:py-14`}>
      <div className="mx-auto max-w-3xl">
        <nav className="text-sm text-muted" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link to="/" className={`hover:text-primary ${focusRing} rounded-sm`}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink" aria-current="page">
              Contact
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <p className="text-sm font-semibold text-primary">Support</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Contact BestConvert
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Questions about a PDF tool, bug reports, privacy inquiries, or feedback? Send us a message using the form below.
          </p>
        </header>

        <AdSlot slot="content" className="mt-8" />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_16rem]">
          <section
            aria-labelledby="contact-form-heading"
            className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8"
          >
            <h2 id="contact-form-heading" className="text-xl font-semibold text-ink">
              Send a message
            </h2>
            <p className="mt-1 text-sm text-muted">
              Include the tool name and what happened if you are reporting a conversion issue. Do not include sensitive or confidential file contents.
            </p>

            {status === "success" && feedback && (
              <div
                role="status"
                className="mt-5 flex gap-3 rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-ink"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{feedback}</p>
                  {referenceId && (
                    <p className="mt-1 text-xs text-muted">Reference ID: {referenceId}</p>
                  )}
                </div>
              </div>
            )}

            {status === "error" && feedback && (
              <div
                role="alert"
                className="mt-5 flex gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{feedback}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              {/* Honeypot field for automated spam filtering */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-ink">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    minLength={CONTACT_LIMITS.nameMin}
                    maxLength={CONTACT_LIMITS.nameMax}
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={status === "submitting"}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-ink">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    maxLength={CONTACT_LIMITS.emailMax}
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={status === "submitting"}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-sm font-medium text-ink">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                  minLength={CONTACT_LIMITS.subjectMin}
                  maxLength={CONTACT_LIMITS.subjectMax}
                  placeholder="How can we help?"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={status === "submitting"}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="contact-message" className="block text-sm font-medium text-ink">
                    Message
                  </label>
                  <span className="text-xs text-muted">
                    {message.length}/{CONTACT_LIMITS.messageMax}
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  minLength={CONTACT_LIMITS.messageMin}
                  maxLength={CONTACT_LIMITS.messageMax}
                  placeholder="Describe your question, feedback, or issue..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={status === "submitting"}
                  className={cn(inputClass, "resize-y")}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full sm:w-auto">
                  {status === "submitting" ? "Sending message…" : "Send message"}
                </Button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Quick Help</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Check file size limits, supported formats, and common questions before writing.
              </p>
              <Link
                to="/help"
                className={`mt-3 inline-flex text-sm font-semibold text-primary hover:underline ${focusRing} rounded-sm`}
              >
                Visit Help &amp; FAQ &rarr;
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Privacy &amp; Terms</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Uploaded documents are deleted automatically after processing and download expiry.
              </p>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <Link
                  to="/privacy"
                  className={`inline-flex font-semibold text-primary hover:underline ${focusRing} rounded-sm`}
                >
                  Privacy Policy &rarr;
                </Link>
                <Link
                  to="/terms"
                  className={`inline-flex font-semibold text-primary hover:underline ${focusRing} rounded-sm`}
                >
                  Terms of Service &rarr;
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Platform</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                BestConvert is operated as part of the{" "}
                <a
                  href="https://futuresolutionai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold text-primary hover:underline ${focusRing} rounded-sm`}
                >
                  FutureSolutionAI
                </a>{" "}
                product suite.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
