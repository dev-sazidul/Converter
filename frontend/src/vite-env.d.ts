/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_HEADER?: string;
  readonly VITE_ADSENSE_SLOT_HOME?: string;
  readonly VITE_ADSENSE_SLOT_CONTENT?: string;
  readonly VITE_ADSENSE_SLOT_TOOL?: string;
  readonly VITE_ADSENSE_SLOT_FOOTER?: string;
}

interface Window {
  adsbygoogle?: Record<string, unknown>[];
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
