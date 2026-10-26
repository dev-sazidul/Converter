export const POPUP_INTERVAL_MS = 20_000;

export type AdSlotId = "header" | "home" | "content" | "tool" | "footer";

const slotEnv: Record<AdSlotId, string | undefined> = {
  header: import.meta.env.VITE_ADSENSE_SLOT_HEADER,
  home: import.meta.env.VITE_ADSENSE_SLOT_HOME,
  content: import.meta.env.VITE_ADSENSE_SLOT_CONTENT,
  tool: import.meta.env.VITE_ADSENSE_SLOT_TOOL,
  footer: import.meta.env.VITE_ADSENSE_SLOT_FOOTER,
};

export function adsenseClient(): string {
  return (import.meta.env.VITE_ADSENSE_CLIENT ?? "").trim();
}

export function adsenseSlotId(slot: AdSlotId): string {
  return (slotEnv[slot] ?? "").trim();
}

export const slotPlaceholders: Record<AdSlotId, string> = {
  header: "/ads/banner.svg",
  home: "/ads/rectangle.svg",
  content: "/ads/banner.svg",
  tool: "/ads/rectangle.svg",
  footer: "/ads/banner.svg",
};

export type PopupCreative =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; poster: string; alt: string };

/** House creatives for the popup. AdSense units are not allowed in pop-ups. */
export const popupCreatives: PopupCreative[] = [
  {
    kind: "image",
    src: "/ads/popup.svg",
    alt: "Demo advertisement image",
  },
  {
    kind: "video",
    src: "/ads/flower.mp4",
    poster: "/ads/popup.svg",
    alt: "Demo advertisement video",
  },
];
