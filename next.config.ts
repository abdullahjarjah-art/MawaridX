import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  allowedDevOrigins: [
    "*.serveousercontent.com",
    "*.loca.lt",
  ],
};

export default nextConfig;
