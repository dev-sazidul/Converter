import { describe, expect, it } from "vitest";
import { buildHeadTags, publicPaths, statusForPath } from "@/lib/seo";

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
    expect(tool).toContain("WebApplication");
    expect(statusForPath("/merge-pdf")).toBe(200);
    expect(statusForPath("/not-a-tool")).toBe(404);
    expect(statusForPath("/help")).toBe(200);
  });

  it("lists every public URL for the sitemap", () => {
    const paths = publicPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/merge-pdf");
    expect(paths).toContain("/pdf-to-pdfa");
    expect(paths).toContain("/sign-pdf");
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
