import { JsonLd } from "@/components/seo/JsonLd";
import { ConvertPdfPage } from "@/views/ConvertPdfPage";
import { pageMetadata } from "@/lib/metadata";

const title = "Convert PDF Online Free — Convarter";
const description = "Convert Word, Excel, PowerPoint, HTML, and JPG files to PDF, or save a PDF as Word, Excel, PowerPoint, JPG, or PDF/A.";

export const metadata = pageMetadata(title, description, "/convert-pdf");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/convert-pdf" />
      <ConvertPdfPage />
    </>
  );
}
