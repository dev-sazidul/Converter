"use client";

import { AdSlot } from "@/components/ads/AdSlot";
import { useLimits } from "@/components/limits/LimitsProvider";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;

export function PrivacyPage() {
  const limits = useLimits();
  const hours = Math.max(1, Math.round(limits.job_ttl_seconds / 3600));
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">Privacy</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted">Applies to bestconvert.site</p>
      <AdSlot slot="content" className="mt-8" />

      <div className="mt-6 space-y-6 text-sm leading-7 text-muted">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">1. Uploaded documents and automatic deletion</h2>
          <p>
            BestConvert processes uploaded files only to perform the tool task you requested. Uploaded documents and finished results are stored in isolated temporary job folders on the server—never in a public directory or permanent user library.
          </p>
          <p>
            Uploaded originals are removed as soon as processing finishes. A finished download remains available for about {hours === 1 ? "1 hour" : `${hours} hours`}, after which it is automatically deleted (or purged on server restart).
          </p>
          <p>
            Server logs and job records store only technical metadata (tool name, file sizes, status, and job ID). We do not log the text or contents inside your documents, and passwords entered in Protect PDF or Unlock PDF are never stored or logged.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">2. Contact form submissions</h2>
          <p>
            If you submit a message on our <Link to="/contact" className={link}>Contact page</Link>, we collect the name, email address, subject, and message you provide so we can review and respond to your inquiry. We also store a one-way cryptographic hash (SHA-256) of the request IP address solely for spam and rate-limit protection.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">3. Analytics and advertising cookies</h2>
          <p>
            To keep the tools free, BestConvert uses <strong>Google Analytics</strong> to measure aggregate site traffic and <strong>Google AdSense</strong> to display advertisements. Google and its partners may use cookies or similar identifiers to serve ads based on your visits to this site or other websites, and to measure ad performance.
          </p>
          <p>
            You can manage or opt out of personalized advertising through{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              Google Ads Settings
            </a>
            , or opt out of Google Analytics browser measurement via the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">4. Questions and requests</h2>
          <p>
            Do not upload documents you do not have the right to process. If you have questions about this Privacy Policy or how temporary files are handled, please reach out via our{" "}
            <Link to="/contact" className={link}>Contact page</Link>.
          </p>
        </section>
      </div>
    </article>
  );
}
