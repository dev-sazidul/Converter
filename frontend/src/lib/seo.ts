import { helpFaqs } from "@/lib/help-faq";
import { getToolCopy } from "@/lib/tool-content";
import { availableTools, getTool } from "@/lib/tools";

export type PageHead = {
  title: string;
  description: string;
  path: string;
};

const STATIC_PATHS = new Set(["/", "/tools", "/convert-pdf", "/help", "/about", "/privacy", "/terms"]);

export function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

export function statusForPath(pathname: string): number {
  const path = normalizePath(pathname);
  if (STATIC_PATHS.has(path)) return 200;
  const slug = path.slice(1);
  if (!slug || slug.includes("/")) return 404;
  return getTool(slug) ? 200 : 404;
}

export function isIndexable(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (STATIC_PATHS.has(path)) return true;
  const slug = path.slice(1);
  if (!slug || slug.includes("/")) return false;
  return getTool(slug)?.status === "available";
}

export function publicPaths(): string[] {
  return [...STATIC_PATHS, ...availableTools().map((tool) => `/${tool.slug}`)];
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function absolute(origin: string, path: string): string {
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function breadcrumb(origin: string, items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(origin, item.path),
    })),
  };
}

function faqNode(faqs: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function structuredData(head: PageHead, origin: string): unknown {
  const url = absolute(origin, head.path);
  const slug = head.path.startsWith("/") ? head.path.slice(1) : "";
  const tool = slug ? getTool(slug) : undefined;
  if (tool && tool.status === "available") {
    const copy = getToolCopy(tool.slug);
    const graph: unknown[] = [
      {
        "@type": "SoftwareApplication",
        name: tool.name,
        url,
        description: head.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        provider: { "@type": "Organization", name: "Convarter", url: origin },
      },
      breadcrumb(origin, [
        { name: "Home", path: "/" },
        { name: "All tools", path: "/tools" },
        { name: tool.name, path: head.path },
      ]),
    ];
    if (copy) graph.push(faqNode(copy.faqs));
    return { "@context": "https://schema.org", "@graph": graph };
  }
  if (tool) {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: head.title,
          description: head.description,
          url,
          isPartOf: { "@type": "WebSite", name: "Convarter", url: origin },
        },
        breadcrumb(origin, [
          { name: "Home", path: "/" },
          { name: "All tools", path: "/tools" },
          { name: tool.name, path: head.path },
        ]),
      ],
    };
  }
  if (head.path === "/") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Convarter", url: origin, description: head.description },
        { "@type": "Organization", name: "Convarter", url: origin },
      ],
    };
  }
  const page = {
    "@type": "WebPage",
    name: head.title,
    description: head.description,
    url,
    isPartOf: { "@type": "WebSite", name: "Convarter", url: origin },
  };
  if (head.path === "/help") {
    return { "@context": "https://schema.org", "@graph": [page, faqNode(helpFaqs)] };
  }
  return { "@context": "https://schema.org", ...page };
}

export function buildHeadTags(head: PageHead, origin: string): string {
  const url = absolute(origin, head.path);
  const robots = isIndexable(head.path) ? "index, follow" : "noindex, follow";
  const json = JSON.stringify(structuredData(head, origin)).replaceAll("<", "\\u003c");
  return [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta property="og:site_name" content="Convarter" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(head.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(head.description)}" />`,
    `<script type="application/ld+json" id="structured-data">${json}</script>`,
  ].join("\n    ");
}
