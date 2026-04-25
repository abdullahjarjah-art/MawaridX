import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the production Dockerfile — produces .next/standalone
  // with a minimal node_modules tree and a server.js entry point.
  output: "standalone",

  // instrumentation.ts is supported natively in Next.js 15+; the
  // `experimental.instrumentationHook` flag is removed and breaks the
  // build if set on Next 16. We keep the file at src/instrumentation.ts.

  allowedDevOrigins: [
    "*.serveousercontent.com",
    "*.loca.lt",
  ],
};

export default nextConfig;
