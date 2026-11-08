import { JsonLd } from "@/components/seo/JsonLd";
import { PrivacyPage } from "@/views/PrivacyPage";
import { pageMetadata } from "@/lib/metadata";

const title = "Privacy Policy — Convarter";
const description = "How Convarter handles uploaded documents, temporary files, and automatic deletion after a download expires.";

export const metadata = pageMetadata(title, description, "/privacy");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/privacy" />
      <PrivacyPage />
    </>
  );
}
