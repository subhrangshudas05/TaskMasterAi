import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Initialize the PWA wrapper
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // Don't cache while you are coding!
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ]
  }
};

export default withSerwist(nextConfig);