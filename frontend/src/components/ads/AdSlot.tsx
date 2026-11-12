"use client";

import { useEffect } from "react";
import { adsenseClient, adsenseSlotId, type AdSlotId } from "@/lib/ads";
import { cn } from "@/lib/utils";

const formatClass = {
  banner: "min-h-[90px] max-w-[728px]",
  rectangle: "min-h-[250px] max-w-[336px]",
} as const;

export function AdSlot({
  slot,
  format = "banner",
  className,
}: {
  slot: AdSlotId;
  format?: keyof typeof formatClass;
  className?: string;
}) {
  const client = adsenseClient();
  const slotId = adsenseSlotId(slot);
  const live = Boolean(client && slotId);

  useEffect(() => {
    if (!live) return;
    const scriptId = "convarter-adsense";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
    const queue = (window.adsbygoogle = window.adsbygoogle || []);
    try {
      queue.push({});
    } catch {
      // A slot that was already filled throws. The next mount requests a new unit.
    }
  }, [client, live, slotId]);

  if (!live) return null;

  return (
    <aside aria-label="Advertisement" className={cn("mx-auto w-full", formatClass[format], className)} data-ad-slot={slot}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={format === "banner" ? "horizontal" : "rectangle"}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
