import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allow larger APK file uploads
    },
  },
};

export default nextConfig;
