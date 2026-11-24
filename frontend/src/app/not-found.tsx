import type { Metadata } from "next";
import { NotFoundPage } from "@/views/NotFoundPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Page not found — BestConvert",
  "That page doesn't exist on BestConvert.",
  "/404",
  false,
);

export default function NotFound() {
  return <NotFoundPage />;
}
