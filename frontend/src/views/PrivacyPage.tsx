"use client";

import { AdSlot } from "@/components/ads/AdSlot";
import { useLimits } from "@/components/limits/LimitsProvider";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

export function PrivacyPage() {
  const limits = useLimits();
  const hours = Math.max(1, Math.round(limits.job_ttl_seconds / 3600));
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">Privacy</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Your documents are temporary</h1>
      <AdSlot slot="content" className="mt-8" />
      <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
        <p>
          Converter processes files so you can download a result. Uploaded documents and finished files are stored in a private temporary folder, not in a user account.
        </p>
        <p>
          A finished download is available for about {hours === 1 ? "1 hour" : `${hours} hours`}. After that, or when the server restarts, the files are deleted. Uploaded originals are removed as soon as processing finishes.
        </p>
        <p>
          The server records the tool name, file sizes, and a job id so the task can be completed and cleaned up. It does not record the contents of your documents. Logs do not include the text inside a PDF.
        </p>
        <p>
          This version has no accounts, payment data, or document history. Don't upload a file unless you have the right to process it.
        </p>
        <p>
          The site shows advertisements so the tools can stay free. Until an AdSense publisher id is added, those spaces use demo images. A separate popup shows a demo image or video and can be closed at any time. When AdSense is turned on, Google may set cookies to measure and choose ads. AdSense is not placed inside the popup.
        </p>
        <p>
          If you have questions about how temporary files or privacy are handled, please reach out via our{" "}
          <Link to="/contact" className={`font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`}>
            Contact page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
