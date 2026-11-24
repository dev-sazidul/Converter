import { JsonLd } from "@/components/seo/JsonLd";
import { TermsPage } from "@/views/TermsPage";
import { pageMetadata } from "@/lib/metadata";

const title = "Terms of Use — BestConvert";
const description = "Terms for using BestConvert's free PDF tools, including what you may upload and how results are provided.";

export const metadata = pageMetadata(title, description, "/terms");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/terms" />
      <TermsPage />
    </>
  );
}
