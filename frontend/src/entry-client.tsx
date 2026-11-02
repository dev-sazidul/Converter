import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import "@/index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

hydrateRoot(
  root,
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
