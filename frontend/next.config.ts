import path from "node:path";
import type { NextConfig } from "next";

const apiTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  experimental: {
    proxyTimeout: 180_000,
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
