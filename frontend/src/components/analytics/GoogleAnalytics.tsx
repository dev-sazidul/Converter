"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { GA_MEASUREMENT_ID } from "@/lib/ga";

let lastTrackedUrl = "";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    if (lastTrackedUrl === pagePath) return;
    lastTrackedUrl = pagePath;
    window.gtag?.("event", "page_view", {
      send_to: GA_MEASUREMENT_ID,
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}
