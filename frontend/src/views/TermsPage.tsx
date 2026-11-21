import { AdSlot } from "@/components/ads/AdSlot";
import { container } from "@/lib/utils";

export function TermsPage() {
  return (
    <article className={`${container} max-w-3xl py-12`}>
      <p className="text-sm font-semibold text-primary">Terms</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Use the tools for files you can share</h1>
      <AdSlot slot="content" className="mt-8" />
      <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
        <p>
          Converter is provided as a document utility. You may only upload files you have the right to use. Don't use the service to break into systems, distribute malware, or process someone else's private documents without permission.
        </p>
        <p>
          Processing can fail for damaged files, encrypted PDFs, or documents over the published limits. A failed task does not create a download. Results are generated automatically and may not match a hand-edited original.
        </p>
        <p>
          The service is offered without a warranty. File-size reduction, page order, and image quality depend on the document you upload and the options you choose.
        </p>
        <p>
          Tools marked Coming soon are descriptions of planned work. They do not accept files. The site may show advertisements around the tools. Closing a popup ad does not change how your files are processed.
        </p>
      </div>
    </article>
  );
}
