import { AdSlot } from "@/components/ads/AdSlot";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { container } from "@/lib/utils";

export function AllToolsPage() {
  return (
    <div className="pb-8 pt-10">
      <div className={`${container} pb-8`}>
        <AdSlot slot="content" />
      </div>
      <ToolBrowser />
    </div>
  );
}
