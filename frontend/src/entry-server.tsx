import { StrictMode, type MutableRefObject } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { App } from "@/App";
import { HeadContext } from "@/components/seo/usePageMeta";
import { buildHeadTags, normalizePath, publicPaths, statusForPath, type PageHead } from "@/lib/seo";

export { publicPaths };

export function render(url: string, origin: string) {
  const head: MutableRefObject<PageHead | null> = { current: null };
  const html = renderToString(
    <StrictMode>
      <HeadContext.Provider value={head}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </HeadContext.Provider>
    </StrictMode>,
  );
  const path = normalizePath(url);
  const meta = head.current ?? {
    title: "Convarter — PDF tools, clearly done",
    description: "Merge, split, compress, rotate, and convert PDFs. Files are processed for the task and then deleted.",
    path,
  };
  return {
    html,
    head: buildHeadTags(meta, origin),
    status: statusForPath(path),
  };
}
