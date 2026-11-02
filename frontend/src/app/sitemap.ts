import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/metadata";
import { publicPaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return publicPaths().map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "weekly",
  }));
}
