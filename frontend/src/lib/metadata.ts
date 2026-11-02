import type { Metadata } from "next";

export function siteOrigin(): string {
  return (process.env.SITE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
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
