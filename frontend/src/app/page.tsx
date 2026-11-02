import { JsonLd } from "@/components/seo/JsonLd";
import { HomePage } from "@/views/HomePage";
import { pageMetadata } from "@/lib/metadata";

const title = "Home — Convarter";
const description = "Merge, split, compress, rotate, and convert PDFs in your browser. Files are processed for the task and then deleted.";

export const metadata = pageMetadata(title, description, "/");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/" />
      <HomePage />
    </>
  );
}
