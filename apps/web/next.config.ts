import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow mobile devices on LAN to access Next.js dev server and HMR */
  allowedDevOrigins: [
    "192.168.100.18",
    "192.168.*.*",
    "localhost",
    "127.0.0.1",
    "*.local",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
