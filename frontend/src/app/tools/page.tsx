import { JsonLd } from "@/components/seo/JsonLd";
import { AllToolsPage } from "@/views/AllToolsPage";
import { pageMetadata } from "@/lib/metadata";

const title = "All PDF tools — Convarter";
const description = "Browse Convarter tools to merge, split, compress, rotate, and convert PDFs.";

export const metadata = pageMetadata(title, description, "/tools");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/tools" />
      <AllToolsPage />
    </>
  );
}
