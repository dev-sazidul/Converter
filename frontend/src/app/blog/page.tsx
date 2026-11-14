import { JsonLd } from "@/components/seo/JsonLd";
import { BlogIndexPage } from "@/views/BlogIndexPage";
import { pageMetadata } from "@/lib/metadata";

const title = "PDF & Document Workflow Guides, Tutorials & Best Practices — Convarter";
const description = "Explore expert PDF workflows: compressing PDFs under 100KB, converting tables to Excel cleanly, PDF/A archiving standards, and image preprocessing tips.";

export const metadata = pageMetadata(title, description, "/blog");

export default function Page() {
  return (
    <>
      <JsonLd title={title} description={description} path="/blog" />
      <BlogIndexPage />
    </>
  );
}

