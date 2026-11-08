import type { Metadata } from "next";

export function siteOrigin(): string {
  return (process.env.SITE_URL || "https://bestconvert.site").replace(/\/$/, "");
}

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: true },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Convarter",
      type: "website",
      locale: "en_US",
    },
    twitter: { card: "summary", title, description },
  };
}
