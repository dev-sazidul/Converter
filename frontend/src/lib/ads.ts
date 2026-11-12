export type AdSlotId = "header" | "home" | "content" | "tool" | "footer";

const slotEnv: Record<AdSlotId, string | undefined> = {
  header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER,
  home: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME,
  content: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT,
  tool: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL,
  footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER,
};

export function adsenseClient(): string {
  return (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim();
}

export function adsenseSlotId(slot: AdSlotId): string {
  return (slotEnv[slot] ?? "").trim();
}
