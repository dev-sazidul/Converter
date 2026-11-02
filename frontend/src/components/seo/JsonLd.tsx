import { structuredData } from "@/lib/seo";
import { siteOrigin } from "@/lib/metadata";

export function JsonLd({ title, description, path }: { title: string; description: string; path: string }) {
  const json = JSON.stringify(structuredData({ title, description, path }, siteOrigin())).replaceAll("<", "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
