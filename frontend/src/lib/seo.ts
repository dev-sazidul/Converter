import { getTool, tools } from "@/lib/tools";

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

export function publicPaths(): string[] {
  return [...STATIC_PATHS, ...tools.map((tool) => `/${tool.slug}`)];
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function absolute(origin: string, path: string): string {
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function structuredData(head: PageHead, origin: string): unknown {
  const url = absolute(origin, head.path);
  const slug = head.path.startsWith("/") ? head.path.slice(1) : "";
  const tool = slug ? getTool(slug) : undefined;
  if (tool) {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          name: tool.name,
          url,
          description: head.description,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          provider: { "@type": "Organization", name: "Convarter", url: origin },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absolute(origin, "/") },
            { "@type": "ListItem", position: 2, name: tool.name, item: url },
          ],
        },
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
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: head.title,
    description: head.description,
    url,
    isPartOf: { "@type": "WebSite", name: "Convarter", url: origin },
  };
}

export function buildHeadTags(head: PageHead, origin: string): string {
  const url = absolute(origin, head.path);
  const robots = statusForPath(head.path) === 200 ? "index, follow" : "noindex";
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
