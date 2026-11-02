import { createContext, useContext, useEffect, type MutableRefObject } from "react";
import { useLocation } from "react-router-dom";
import { applyClientHead, normalizePath, type PageHead } from "@/lib/seo";

export const HeadContext = createContext<MutableRefObject<PageHead | null> | null>(null);

export function usePageMeta(title: string, description: string) {
  const location = useLocation();
  const head = useContext(HeadContext);
  const path = normalizePath(location.pathname);
  if (head) head.current = { title, description, path };

  useEffect(() => {
    applyClientHead({ title, description, path });
  }, [title, description, path]);
}
