import { JsonLd } from "@/components/seo/JsonLd";
import { AboutPage } from "@/views/AboutPage";
import { pageMetadata } from "@/lib/metadata";

const title = "About Converter PDF Tools";
const description = "Converter is an independent PDF toolkit for merging, splitting, compressing, rotating, and converting documents on bestconvert.site.";

export const metadata = pageMetadata(title, description, "/about");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/about" />
      <AboutPage />
    </>
  );
}
