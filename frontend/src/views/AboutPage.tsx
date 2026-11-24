import { AdSlot } from "@/components/ads/AdSlot";
import { EcosystemTools } from "@/components/layout/EcosystemTools";
import { Link } from "@/components/ui/Link";
import { container, focusRing } from "@/lib/utils";

const link = `font-semibold text-primary underline-offset-2 hover:underline ${focusRing} rounded-sm`;

export function AboutPage() {
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">About</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        About BestConvert (bestconvert.site)
      </h1>
      <AdSlot slot="content" className="mt-8" />

      <div className="mt-6 space-y-6 text-sm leading-7 text-muted">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">What BestConvert does</h2>
          <p>
            BestConvert is a free online PDF and document toolkit hosted at{" "}
            <span className="font-medium text-ink">bestconvert.site</span> and developed as part of the{" "}
            <a
              href="https://futuresolutionai.com"
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              FutureSolutionAI
            </a>{" "}
            product suite. It provides 22 focused utilities for everyday document work—merging, splitting, compressing, rotating, editing, watermarking, numbering, repairing, running OCR, signing, protecting, unlocking, and converting between PDF, JPG, Word, Excel, PowerPoint, HTML, and PDF/A.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">How files are processed</h2>
          <p>
            When you run a tool, your browser sends the file to our processing service on the same server. The service inspects the file contents (not just the file extension), checks size and page limits, runs the requested task in an isolated temporary job directory, and deletes the original upload as soon as processing finishes.
          </p>
          <p>
            Finished downloads remain available for about 1 hour so you can save your result, after which they are automatically removed. There are no user accounts, saved document libraries, or paywalls in this version.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Honest expectations</h2>
          <p>
            Document conversion and PDF repair are automated processes. Complex layouts can shift when converting between PDF and editable Office formats, visual signatures are image-based rather than cryptographic certificates, and PDF/A outputs are checked for archive markers rather than certified by a third-party auditor. Each tool page explains its exact options and limitations before you upload.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Support &amp; policies</h2>
          <p>
            For file limits and troubleshooting, visit{" "}
            <Link to="/help" className={link}>Help &amp; FAQ</Link>. You can also review our{" "}
            <Link to="/privacy" className={link}>Privacy Policy</Link> and{" "}
            <Link to="/terms" className={link}>Terms of Service</Link>, or send feedback and bug reports through our{" "}
            <Link to="/contact" className={link}>Contact page</Link>.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <EcosystemTools />
      </div>
    </article>
  );
}
