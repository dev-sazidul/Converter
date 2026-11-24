import { JsonLd } from "@/components/seo/JsonLd";
import { AllToolsPage } from "@/views/AllToolsPage";
import { pageMetadata } from "@/lib/metadata";

const title = "All Free PDF Tools — BestConvert";
const description = "Browse 22 free online PDF tools to merge, split, compress, edit, OCR, repair, sign, protect, unlock, and convert documents without an account.";

export const metadata = pageMetadata(title, description, "/tools");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/tools" />
      <AllToolsPage />
    </>
  );
}
