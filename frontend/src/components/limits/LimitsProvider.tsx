"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultLimits, getMeta, type Limits } from "@/lib/api";

const LimitsContext = createContext<Limits>(defaultLimits);

export function LimitsProvider({ children }: { children: ReactNode }) {
  const [limits, setLimits] = useState<Limits>(defaultLimits);

  useEffect(() => {
    const controller = new AbortController();
    getMeta(controller.signal)
      .then((meta) => setLimits(meta.limits))
      .catch(() => {
        /* The form still works with the default limits. The server enforces its own. */
      });
    return () => controller.abort();
  }, []);

  return <LimitsContext.Provider value={limits}>{children}</LimitsContext.Provider>;
}

export function useLimits(): Limits {
  return useContext(LimitsContext);
}
