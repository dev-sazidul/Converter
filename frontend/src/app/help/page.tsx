import { JsonLd } from "@/components/seo/JsonLd";
import { HelpPage } from "@/views/HelpPage";
import { pageMetadata } from "@/lib/metadata";

const title = "PDF Tool Help — BestConvert";
const description = "How BestConvert processes PDFs, which file types work, the size and page limits, and answers about temporary files.";

export const metadata = pageMetadata(title, description, "/help");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/help" />
      <HelpPage />
    </>
  );
}
