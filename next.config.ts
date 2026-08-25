import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo sits inside a parent folder that has its own lockfile; pin the
  // root so the workspace is detected correctly. `__dirname` is not defined
  // when the config is loaded as ESM, so use import.meta.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
