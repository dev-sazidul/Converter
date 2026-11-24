import { AdSlot } from "@/components/ads/AdSlot";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;

export function TermsPage() {
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">Terms</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted">Applies to bestconvert.site</p>
      <AdSlot slot="content" className="mt-8" />

      <div className="mt-6 space-y-6 text-sm leading-7 text-muted">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">1. Acceptable use</h2>
          <p>
            BestConvert is provided as an online document utility. By using these tools, you agree to upload and process only files that you own or have permission to handle. You must not use the service to distribute malware, attempt unauthorized access, bypass rate or size limits, or process another person&apos;s private documents without authorization.
          </p>
          <p>
            In particular, <Link to="/unlock-pdf" className={link}>Unlock PDF</Link> may only be used for documents where you hold the valid password and have the legal right to remove encryption.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">2. Automated processing and limitations</h2>
          <p>
            All conversions, compressions, repairs, OCR extractions, and edits are performed automatically. Processing can fail for severely corrupted files, unsupported formats, or documents exceeding published size and page limits (see <Link to="/help" className={link}>Help &amp; Limits</Link>).
          </p>
          <p>
            Generated outputs may not match a hand-edited original in every layout detail. Visual signatures placed with <Link to="/sign-pdf" className={link}>Sign PDF</Link> are image-based and do not constitute cryptographic digital certificates, and <Link to="/pdf-to-pdfa" className={link}>PDF to PDF/A</Link> checks are not a formal ISO certification.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">3. Availability and no warranty</h2>
          <p>
            The service is provided &ldquo;as is&rdquo; without warranties of any kind, whether express or implied. Because uploaded and processed files are stored only temporarily and deleted automatically after download expiry, you should always keep your own backup copies of important documents.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">4. Contact</h2>
          <p>
            For questions about these Terms of Service or to report misuse or a technical issue, please use our{" "}
            <Link to="/contact" className={link}>Contact page</Link> and review our{" "}
            <Link to="/privacy" className={link}>Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </article>
  );
}
