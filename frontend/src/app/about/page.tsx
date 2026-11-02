import { JsonLd } from "@/components/seo/JsonLd";
import { AboutPage } from "@/views/AboutPage";
import { pageMetadata } from "@/lib/metadata";

const title = "About Convarter";
const description = "Convarter is a self-hosted PDF tools site for organizing PDFs and converting documents.";

export const metadata = pageMetadata(title, description, "/about");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/about" />
      <AboutPage />
    </>
  );
}
