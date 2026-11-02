import { JsonLd } from "@/components/seo/JsonLd";
import { HelpPage } from "@/views/HelpPage";
import { pageMetadata } from "@/lib/metadata";

const title = "Help — Convarter";
const description = "How Convarter processes PDFs, file limits, and answers to common questions.";

export const metadata = pageMetadata(title, description, "/help");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/help" />
      <HelpPage />
    </>
  );
}
