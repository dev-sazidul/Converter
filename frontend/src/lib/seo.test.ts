import { describe, expect, it } from "vitest";
import { buildHeadTags, publicPaths, statusForPath } from "@/lib/seo";
import { getToolCopy } from "@/lib/tool-content";
import { availableTools, getTool } from "@/lib/tools";

describe("page metadata", () => {
  it("includes a title, description, canonical URL, and structured data", () => {
    const head = buildHeadTags(
      {
        title: "Home — Converter",
        description: "Merge, split, compress, rotate, and convert PDFs in your browser. Files are processed for the task and then deleted.",
        path: "/",
      },
      "https://convarter.example",
    );
    expect(head).toContain("<title>Home — Converter</title>");
    expect(head).toContain('rel="canonical" href="https://convarter.example/"');
    expect(head).toContain("og:description");
    expect(head).toContain("WebSite");
  });

  it("marks tool pages and unknown addresses", () => {
    const tool = buildHeadTags(
      { title: "Merge PDF online — Converter", description: "Combine PDFs.", path: "/merge-pdf" },
      "https://convarter.example",
    );
    expect(tool).toContain("SoftwareApplication");
    expect(tool).toContain("FAQPage");
    expect(tool).toContain("Can I change the page order before merging?");
    expect(statusForPath("/merge-pdf")).toBe(200);
    expect(statusForPath("/not-a-tool")).toBe(404);
    expect(statusForPath("/help")).toBe(200);
    expect(statusForPath("/contact")).toBe(200);
  });

  it("lists indexable URLs including all 22 working tools", () => {
    const paths = publicPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/contact");
    expect(paths).toContain("/merge-pdf");
    expect(paths).toContain("/pdf-to-pdfa");
    expect(paths).toContain("/sign-pdf");
    expect(paths).toContain("/edit-pdf");
    expect(paths).toContain("/ocr-pdf");
    expect(paths).toContain("/protect-pdf");
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

  it("enriches schema with FutureSolutionAI parentOrganization, creator and ecosystem sameAs", () => {
    const homeHead = buildHeadTags(
      { title: "Home — Converter", description: "Home description.", path: "/" },
      "https://bestconvert.site",
    );
    expect(homeHead).toContain("FutureSolutionAI");
    expect(homeHead).toContain("https://futuresolutionai.com");
    expect(homeHead).toContain("https://imagecustomize.site");
    expect(homeHead).toContain("https://bestdownloader.site");

    const toolHead = buildHeadTags(
      { title: "Merge PDF — Converter", description: "Merge tool.", path: "/merge-pdf" },
      "https://bestconvert.site",
    );
    expect(toolHead).toContain('"creator":{"@type":"Organization","name":"FutureSolutionAI","url":"https://futuresolutionai.com"}');
    expect(toolHead).toContain('"parentOrganization":{"@type":"Organization","name":"FutureSolutionAI","url":"https://futuresolutionai.com"}');
  });

  it("supports blog routing, indexability, and sitemap inclusion", () => {
    expect(statusForPath("/blog")).toBe(200);
    expect(statusForPath("/blog/compress-pdf-under-100kb-200kb")).toBe(200);
    expect(statusForPath("/blog/not-a-real-blog")).toBe(404);

    const paths = publicPaths();
    expect(paths).toContain("/blog");
    expect(paths).toContain("/blog/compress-pdf-under-100kb-200kb");
    expect(paths).toContain("/blog/convert-pdf-tables-to-excel-cleanly");
    expect(paths).toContain("/blog/pdf-vs-pdfa-long-term-archiving-guide");
    expect(paths).toContain("/blog/prepare-jpg-images-before-merging-pdf");
    expect(paths).toContain("/blog/convert-word-to-pdf-without-formatting-issues");
    expect(paths).toContain("/blog/how-to-split-pdf-extract-pages-securely");

    const blogHead = buildHeadTags(
      {
        title: "Compress PDF Under 100KB — Converter",
        description: "Compress PDF under 100KB guide.",
        path: "/blog/compress-pdf-under-100kb-200kb",
      },
      "https://bestconvert.site",
    );
    expect(blogHead).toContain("BlogPosting");
    expect(blogHead).toContain("BreadcrumbList");
    expect(blogHead).toContain("How to Compress PDFs Under 100KB or 200KB");
  });
});
