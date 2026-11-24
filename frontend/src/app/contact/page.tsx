import { JsonLd } from "@/components/seo/JsonLd";
import { ContactPage } from "@/views/ContactPage";
import { pageMetadata } from "@/lib/metadata";

const title = "Contact Us — BestConvert";
const description = "Contact the BestConvert team on bestconvert.site for PDF tool support, bug reports, privacy inquiries, or feedback.";

export const metadata = pageMetadata(title, description, "/contact");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/contact" />
      <ContactPage />
    </>
  );
}
