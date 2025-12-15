import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /*distDir: 'target/dist',*/
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Allow larger APK file uploads
    },
    middlewareClientMaxBodySize: '100mb', // Allow large file uploads through middleware
  },
  serverExternalPackages: ['adbkit-apkreader'],
};

export default nextConfig;
