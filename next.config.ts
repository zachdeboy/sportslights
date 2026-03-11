import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    PROXY_URL: process.env.PROXY_URL || "http://localhost:3001",
  },
};

export default nextConfig;
