import { describe, expect, it } from "vitest";
import { buildHeadTags, publicPaths, statusForPath } from "@/lib/seo";
import { getToolCopy } from "@/lib/tool-content";
import { availableTools, getTool } from "@/lib/tools";

describe("page metadata", () => {
  it("includes a title, description, canonical URL, and structured data", () => {
    const head = buildHeadTags(
      {
        title: "Home — Convarter",
        description: "Merge, split, compress, rotate, and convert PDFs in your browser. Files are processed for the task and then deleted.",
        path: "/",
      },
      "https://convarter.example",
    );
    expect(head).toContain("<title>Home — Convarter</title>");
    expect(head).toContain('rel="canonical" href="https://convarter.example/"');
    expect(head).toContain("og:description");
    expect(head).toContain("WebSite");
  });

  it("marks tool pages and unknown addresses", () => {
    const tool = buildHeadTags(
      { title: "Merge PDF online — Convarter", description: "Combine PDFs.", path: "/merge-pdf" },
      "https://convarter.example",
    );
    expect(tool).toContain("SoftwareApplication");
    expect(tool).toContain("FAQPage");
    expect(tool).toContain("Can I change the page order before merging?");
    expect(statusForPath("/merge-pdf")).toBe(200);
    expect(statusForPath("/not-a-tool")).toBe(404);
    expect(statusForPath("/help")).toBe(200);
  });

  it("lists indexable URLs and leaves coming soon tools out of the sitemap", () => {
    const paths = publicPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/merge-pdf");
    expect(paths).toContain("/pdf-to-pdfa");
    expect(paths).not.toContain("/sign-pdf");
    expect(paths).not.toContain("/edit-pdf");
    const soon = buildHeadTags(
      { title: "Edit PDF — coming soon — Convarter", description: "Not available.", path: "/edit-pdf" },
      "https://convarter.example",
    );
    expect(soon).toContain("noindex, follow");
    expect(soon).not.toContain("SoftwareApplication");
  });

  it("gives every working tool a unique title, description, and matching FAQ", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const tool of availableTools()) {
      expect(titles.has(tool.seoTitle)).toBe(false);
      expect(descriptions.has(tool.seoDescription)).toBe(false);
      titles.add(tool.seoTitle);
      descriptions.add(tool.seoDescription);
      expect(tool.seoTitle.length).toBeLessThan(70);
      expect(tool.seoDescription.length).toBeGreaterThan(80);
      expect(tool.seoDescription.length).toBeLessThan(180);
      const copy = getToolCopy(tool.slug);
      expect(copy?.faqs).toHaveLength(3);
      expect(copy?.heading).toBeTruthy();
      for (const slug of copy?.related ?? []) {
        expect(getTool(slug)?.status).toBe("available");
      }
    }
  });

  it("escapes characters in titles", () => {
    const head = buildHeadTags(
      { title: `Tom & "Jerry"`, description: "A <description>", path: "/help" },
      "https://convarter.example",
    );
    expect(head).toContain("Tom &amp; &quot;Jerry&quot;");
    expect(head).toContain("A &lt;description&gt;");
  });
});
