import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Same-origin API: the browser calls /api/*, Next proxies to FastAPI (baked at build time).
  rewrites: async () => [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL ?? "http://localhost:8000"}/api/:path*` }],
};

export default config;
