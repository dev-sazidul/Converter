import type { Metadata } from "next";

export function siteOrigin(): string {
  return (process.env.SITE_URL || "https://bestconvert.site").replace(/\/$/, "");
}

export function ogImageUrl(): string {
  return `${siteOrigin()}/og-image.png`;
}

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  const image = ogImageUrl();
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: true },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "BestConvert",
      type: "website",
      locale: "en_US",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: "BestConvert — Free Online PDF Tools",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
