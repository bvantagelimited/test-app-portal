import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    distDir: 'target/dist',
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allow larger APK file uploads
    },
  },
};

export default nextConfig;
