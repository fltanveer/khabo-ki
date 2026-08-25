import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root sits inside a parent folder that has its own lockfile.
  turbopack: { root: __dirname },
};

export default nextConfig;
