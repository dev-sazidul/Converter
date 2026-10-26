import { AdSlot } from "@/components/ads/AdSlot";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { usePageMeta } from "@/components/seo/usePageMeta";
import { container } from "@/lib/utils";

export function AllToolsPage() {
  usePageMeta(
    "All PDF tools — Convarter",
    "Browse Convarter tools to merge, split, compress, rotate, and convert PDFs.",
  );
  return (
    <div className="pb-8 pt-10">
      <div className={`${container} pb-8`}>
        <AdSlot slot="content" />
      </div>
      <ToolBrowser />
    </div>
  );
}
