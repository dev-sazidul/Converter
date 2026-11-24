import { getAllBlogs, getBlogBySlug } from "@/lib/blogs";
import { helpFaqs } from "@/lib/help-faq";
import { getToolCopy } from "@/lib/tool-content";
import { availableTools, getTool } from "@/lib/tools";

export type PageHead = {
  title: string;
  description: string;
  path: string;
};

const STATIC_PATHS = new Set(["/", "/tools", "/convert-pdf", "/help", "/about", "/contact", "/privacy", "/terms", "/blog"]);

const parentOrganizationNode = {
  "@type": "Organization",
  name: "FutureSolutionAI",
  url: "https://futuresolutionai.com",
};

const ecosystemSameAs = [
  "https://futuresolutionai.com",
  "https://imagecustomize.site",
  "https://bestdownloader.site",
];

function organizationNode(origin: string) {
  return {
    "@type": "Organization",
    name: "BestConvert",
    url: origin,
    sameAs: ecosystemSameAs,
    parentOrganization: parentOrganizationNode,
  };
}

export function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

export function statusForPath(pathname: string): number {
  const path = normalizePath(pathname);
  if (STATIC_PATHS.has(path)) return 200;
  if (path.startsWith("/blog/")) {
    const blogSlug = path.slice("/blog/".length);
    if (!blogSlug || blogSlug.includes("/")) return 404;
    return getBlogBySlug(blogSlug) ? 200 : 404;
  }
  const slug = path.slice(1);
  if (!slug || slug.includes("/")) return 404;
  return getTool(slug) ? 200 : 404;
}

export function isIndexable(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (STATIC_PATHS.has(path)) return true;
  if (path.startsWith("/blog/")) {
    const blogSlug = path.slice("/blog/".length);
    if (!blogSlug || blogSlug.includes("/")) return false;
    return Boolean(getBlogBySlug(blogSlug));
  }
  const slug = path.slice(1);
  if (!slug || slug.includes("/")) return false;
  return getTool(slug)?.status === "available";
}

export function publicPaths(): string[] {
  return [
    ...STATIC_PATHS,
    ...availableTools().map((tool) => `/${tool.slug}`),
    ...getAllBlogs().map((blog) => `/blog/${blog.slug}`),
  ];
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
  const org = organizationNode(origin);

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
        provider: org,
        creator: parentOrganizationNode,
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
          isPartOf: { "@type": "WebSite", name: "BestConvert", url: origin },
          publisher: org,
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
        { "@type": "WebSite", name: "BestConvert", url: origin, description: head.description },
        org,
      ],
    };
  }

  if (head.path === "/blog") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: head.title,
          description: head.description,
          url,
          isPartOf: { "@type": "WebSite", name: "BestConvert", url: origin },
          publisher: org,
        },
        breadcrumb(origin, [
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]),
      ],
    };
  }

  if (head.path.startsWith("/blog/")) {
    const blogSlug = head.path.slice("/blog/".length);
    const blog = getBlogBySlug(blogSlug);
    if (blog) {
      const graph: unknown[] = [
        {
          "@type": "BlogPosting",
          headline: blog.title,
          description: blog.summary,
          url,
          datePublished: blog.publishedAt,
          dateModified: blog.publishedAt,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          author: {
            "@type": "Organization",
            name: blog.author,
            url: origin,
          },
          publisher: org,
        },
        breadcrumb(origin, [
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: blog.title, path: head.path },
        ]),
      ];
      if (blog.faqs.length > 0) {
        graph.push(faqNode(blog.faqs));
      }
      return { "@context": "https://schema.org", "@graph": graph };
    }
  }

  const page = {
    "@type": "WebPage",
    name: head.title,
    description: head.description,
    url,
    isPartOf: { "@type": "WebSite", name: "BestConvert", url: origin },
    publisher: org,
  };

  if (head.path === "/help") {
    return { "@context": "https://schema.org", "@graph": [page, faqNode(helpFaqs)] };
  }

  return { "@context": "https://schema.org", ...page };
}

export function buildHeadTags(head: PageHead, origin: string): string {
  const url = absolute(origin, head.path);
  const image = absolute(origin, "/og-image.png");
  const robots = isIndexable(head.path) ? "index, follow" : "noindex, follow";
  const json = JSON.stringify(structuredData(head, origin)).replaceAll("<", "\\u003c");
  return [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta property="og:site_name" content="BestConvert" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(head.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(head.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<script type="application/ld+json" id="structured-data">${json}</script>`,
  ].join("\n    ");
}
