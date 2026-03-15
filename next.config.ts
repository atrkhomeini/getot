import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {},
  
  // Enable source maps for better error traces
  productionBrowserSourceMaps: true,
};

const wrappedConfig = withSerwist(nextConfig);

const sentryConfig = withSentryConfig(wrappedConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  
  // NEW: Use webpack-specific options instead of deprecated top-level ones
  webpack: {
    reactComponentAnnotation: {
      enabled: true,
    },
    treeshake: {
      removeDebugLogging: true,
    },
  },
  
  hideSourceMaps: false, // Changed to false since we want readable traces
});

export default process.env.NEXT_PUBLIC_SENTRY_DSN ? sentryConfig : wrappedConfig;