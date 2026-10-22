import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  typescript: {
    tsconfigPath:
      process.env.NEXT_DIST_DIR === ".next-business"
        ? "tsconfig.business.json"
        : process.env.NEXT_DIST_DIR === ".next-test"
          ? "tsconfig.test-server.json"
          : process.env.NEXT_DIST_DIR === ".next-production"
            ? "tsconfig.production.json"
            : "tsconfig.json",
  },
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
