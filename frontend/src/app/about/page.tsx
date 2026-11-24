import { JsonLd } from "@/components/seo/JsonLd";
import { AboutPage } from "@/views/AboutPage";
import { pageMetadata } from "@/lib/metadata";

const title = "About BestConvert PDF Tools";
const description = "BestConvert is an independent PDF toolkit for merging, splitting, compressing, rotating, and converting documents on bestconvert.site.";

export const metadata = pageMetadata(title, description, "/about");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/about" />
      <AboutPage />
    </>
  );
}
