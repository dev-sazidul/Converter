import { JsonLd } from "@/components/seo/JsonLd";
import { HomePage } from "@/views/HomePage";
import { pageMetadata } from "@/lib/metadata";

const title = "Free PDF Converter Online — Converter";
const description = "Free PDF converter to merge, split, compress, rotate, and convert PDF, Word, Excel, PowerPoint, JPG, and HTML files. No account. Files are deleted after the task.";

export const metadata = pageMetadata(title, description, "/");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/" />
      <HomePage />
    </>
  );
}
