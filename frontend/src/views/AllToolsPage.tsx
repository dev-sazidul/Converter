import { AdSlot } from "@/components/ads/AdSlot";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { container } from "@/lib/utils";

export function AllToolsPage() {
  return (
    <div className="pb-8 pt-10">
      <AdSlot slot="content" className={`${container} pb-8`} />
      <ToolBrowser />
    </div>
  );
}
