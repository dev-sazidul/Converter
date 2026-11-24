import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolPage } from "@/views/ToolPage";
import { pageMetadata } from "@/lib/metadata";
import { getTool, tools } from "@/lib/tools";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) {
    return pageMetadata("Page not found — BestConvert", "That page doesn't exist on BestConvert.", `/${slug}`, false);
  }
  return pageMetadata(tool.seoTitle, tool.seoDescription, `/${tool.slug}`, tool.status === "available");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  return (
    <>
      <JsonLd title={tool.seoTitle} description={tool.seoDescription} path={`/${tool.slug}`} />
      <ToolPage slug={tool.slug} />
    </>
  );
}
