import { describe, expect, it } from "vitest";
import { blogs, getAllBlogs, getBlogBySlug } from "@/lib/blogs";

describe("SEO blogs", () => {
  it("has exactly 6 comprehensive blog posts", () => {
    const all = getAllBlogs();
    expect(all).toHaveLength(6);
    expect(new Set(all.map((b) => b.slug)).size).toBe(6);
  });

  it("ensures every blog post has 700+ words", () => {
    for (const blog of blogs) {
      const allText = [
        blog.title,
        blog.summary,
        ...blog.sections.flatMap((s) => [
          s.heading,
          ...s.paragraphs,
          ...(s.bulletPoints || []),
          s.tip || "",
        ]),
        ...blog.faqs.flatMap((f) => [f.question, f.answer]),
      ].join(" ");

      const wordCount = allText.trim().split(/\s+/).length;
      console.log(`Word count for ${blog.slug}: ${wordCount}`);
      expect(wordCount, `Blog "${blog.slug}" must have at least 700 words, got ${wordCount}`).toBeGreaterThanOrEqual(700);
    }
  });

  it("can find blogs by slug", () => {
    expect(getBlogBySlug("compress-pdf-under-100kb-200kb")).toBeDefined();
    expect(getBlogBySlug("non-existent-blog")).toBeUndefined();
  });
});
