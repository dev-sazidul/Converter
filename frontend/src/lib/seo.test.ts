import { describe, expect, it } from "vitest";
import { render, publicPaths } from "@/entry-server";
import { buildHeadTags, statusForPath } from "@/lib/seo";

describe("server render", () => {
  it("renders the home page with a title, description, and canonical URL", () => {
    const page = render("/", "https://convarter.example");
    expect(page.status).toBe(200);
    expect(page.html).toContain("Every PDF task, clearly done.");
    expect(page.head).toContain("<title>Home — Convarter</title>");
    expect(page.head).toContain('rel="canonical" href="https://convarter.example/"');
    expect(page.head).toContain("og:description");
    expect(page.head).toContain("WebSite");
  });

  it("renders a tool page and rejects an unknown address", () => {
    const tool = render("/merge-pdf", "https://convarter.example");
    expect(tool.status).toBe(200);
    expect(tool.html).toContain("Merge PDF");
    expect(tool.head).toContain("WebApplication");
    expect(render("/not-a-tool", "https://convarter.example").status).toBe(404);
    expect(statusForPath("/help")).toBe(200);
  });

  it("lists every public URL for the sitemap", () => {
    const paths = publicPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/merge-pdf");
    expect(paths).toContain("/pdf-to-pdfa");
    expect(paths).toContain("/sign-pdf");
  });
});

describe("head tags", () => {
  it("escapes characters in titles", () => {
    const head = buildHeadTags(
      { title: `Tom & "Jerry"`, description: "A <description>", path: "/help" },
      "https://convarter.example",
    );
    expect(head).toContain("Tom &amp; &quot;Jerry&quot;");
    expect(head).toContain("A &lt;description&gt;");
  });
});
