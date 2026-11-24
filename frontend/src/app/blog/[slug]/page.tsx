import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { BlogPostPage } from "@/views/BlogPostPage";
import { pageMetadata } from "@/lib/metadata";
import { getAllBlogs, getBlogBySlug } from "@/lib/blogs";

export function generateStaticParams() {
  return getAllBlogs().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) {
    return pageMetadata("Blog Post Not Found — BestConvert", "The requested blog post does not exist.", `/blog/${slug}`, false);
  }
  return pageMetadata(post.seoTitle, post.seoDescription, `/blog/${post.slug}`, true);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd title={post.seoTitle} description={post.seoDescription} path={`/blog/${post.slug}`} />
      <BlogPostPage post={post} />
    </>
  );
}

