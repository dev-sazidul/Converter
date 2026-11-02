import type { Metadata } from "next";
import { NotFoundPage } from "@/views/NotFoundPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Page not found — Convarter",
  "That page doesn't exist on Convarter.",
  "/404",
  false,
);

export default function NotFound() {
  return <NotFoundPage />;
}
