import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import express, { type NextFunction, type Request, type Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { AppModule } from "./app.module.js";
import { clientDir, frontendRoot, requestOrigin, SsrService } from "./ssr.service.js";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' blob: data: https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.googleadservices.com https://*.doubleclick.net https://*.gstatic.com; style-src 'self' 'unsafe-inline'; script-src 'self' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://www.googletagservices.com https://adservice.google.com https://tpc.googlesyndication.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://pagead2.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.googlesyndication.com; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://*.googlesyndication.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function bootstrap() {
  const dev = process.env.NODE_ENV !== "production";
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const server = app.getHttpAdapter().getInstance();
  const ssr = app.get(SsrService);
  const port = Number(process.env.PORT || 3000);
  const apiTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";

  server.disable("x-powered-by");
  server.use(compression());
  server.use((_req: Request, res: Response, next: NextFunction) => {
    if (!dev) {
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
    }
    next();
  });
  server.use(
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      pathFilter: "/api",
      proxyTimeout: 180_000,
      timeout: 180_000,
    }),
  );

  if (dev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: frontendRoot,
      appType: "custom",
      server: {
        middlewareMode: true,
        hmr: { server: app.getHttpServer() },
      },
    });
    server.use(vite.middlewares);
    ssr.attachVite(vite);
  } else {
    ssr.loadProduction();
    server.use(
      express.static(clientDir, {
        index: false,
        immutable: true,
        maxAge: "7d",
        setHeaders(res, filePath) {
          if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
        },
      }),
    );
  }

  server.get("/healthz", (_req: Request, res: Response) => {
    res.type("text/plain").send("ok\n");
  });

  server.get("/robots.txt", (req: Request, res: Response) => {
    const origin = requestOrigin(req);
    res.type("text/plain").send(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  });

  server.get("/sitemap.xml", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const origin = requestOrigin(req);
      const paths = await ssr.paths();
      const urls = paths
        .map((item) => `  <url><loc>${escapeXml(`${origin}${item}`)}</loc></url>`)
        .join("\n");
      res
        .type("application/xml")
        .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    } catch (error) {
      next(error);
    }
  });

  server.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api") || req.path === "/healthz") {
      next();
      return;
    }
    const extension = req.path.includes(".") && !req.path.endsWith(".html");
    if (extension) {
      res.status(404).type("text/plain").send("Not found\n");
      return;
    }
    try {
      const page = await ssr.render(req);
      res.status(page.status).setHeader("Cache-Control", "no-cache").type("html").send(page.html);
    } catch (error) {
      ssr.fixStack(error);
      next(error);
    }
  });

  const httpServer = app.getHttpServer();
  httpServer.requestTimeout = 180_000;
  httpServer.headersTimeout = 185_000;
  await app.listen(port, "0.0.0.0");
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
