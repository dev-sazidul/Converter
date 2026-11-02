import { Injectable } from "@nestjs/common";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Request, RequestHandler } from "express";

export type RenderedPage = {
  html: string;
  head: string;
  status: number;
};

export type ServerModule = {
  render: (url: string, origin: string) => RenderedPage;
  publicPaths: () => string[];
};

type ViteDev = {
  middlewares: RequestHandler;
  transformIndexHtml: (url: string, html: string) => Promise<string>;
  ssrLoadModule: (entry: string) => Promise<unknown>;
  ssrFixStacktrace: (error: Error) => void;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const compiled = here.endsWith(`${path.sep}dist${path.sep}nest`);

export const frontendRoot = compiled ? path.resolve(here, "../..") : path.resolve(here, "..");
export const clientDir = path.join(frontendRoot, "dist", "client");
export const serverEntry = path.join(frontendRoot, "dist", "server", "entry-server.js");

@Injectable()
export class SsrService {
  private vite: ViteDev | null = null;
  private productionModule: ServerModule | null = null;
  private productionTemplate = "";

  attachVite(vite: ViteDev) {
    this.vite = vite;
  }

  loadProduction() {
    this.productionTemplate = readFileSync(path.join(clientDir, "index.html"), "utf8");
  }

  async render(req: Request): Promise<{ status: number; html: string }> {
    const origin = requestOrigin(req);
    const url = req.originalUrl || "/";
    const rendered = await this.renderModule(url, origin);
    const template = await this.template(url);
    const html = template.replace("<!--app-head-->", rendered.head).replace("<!--app-html-->", rendered.html);
    return { status: rendered.status, html };
  }

  async paths(): Promise<string[]> {
    const mod = await this.moduleFor("/");
    return mod.publicPaths();
  }

  fixStack(error: unknown) {
    if (error instanceof Error) this.vite?.ssrFixStacktrace(error);
  }

  private async template(url: string): Promise<string> {
    if (this.vite) {
      const raw = readFileSync(path.join(frontendRoot, "index.html"), "utf8");
      return this.vite.transformIndexHtml(url, raw);
    }
    if (!this.productionTemplate) this.loadProduction();
    return this.productionTemplate;
  }

  private async renderModule(url: string, origin: string): Promise<RenderedPage> {
    const mod = await this.moduleFor(url);
    return mod.render(url, origin);
  }

  private async moduleFor(url: string): Promise<ServerModule> {
    if (this.vite) return (await this.vite.ssrLoadModule("/src/entry-server.tsx")) as ServerModule;
    if (!this.productionModule) {
      this.productionModule = (await import(pathToFileURL(serverEntry).href)) as ServerModule;
    }
    void url;
    return this.productionModule;
  }
}

export function requestOrigin(req: Request): string {
  const forwarded = req.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const proto = protoHeader?.split(",")[0]?.trim() || req.protocol || "http";
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host || "127.0.0.1";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${host}`;
}
