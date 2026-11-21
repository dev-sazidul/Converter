import { JsonLd } from "@/components/seo/JsonLd";
import { AllToolsPage } from "@/views/AllToolsPage";
import { pageMetadata } from "@/lib/metadata";

const title = "All Free PDF Tools — Converter";
const description = "Browse free PDF tools to merge, split, compress, rotate, and convert documents. Coming soon tools are labeled and do not process files.";

export const metadata = pageMetadata(title, description, "/tools");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/tools" />
      <AllToolsPage />
    </>
  );
}
