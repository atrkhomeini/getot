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
  // Add empty turbopack config to suppress the warning
  turbopack: {},
};

// Apply Serwist wrapper first
const wrappedConfig = withSerwist(nextConfig);

// Apply Sentry wrapper second (only if DSN is provided)
const sentryConfig = withSentryConfig(wrappedConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI, // Only print logs in CI
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  hideSourceMaps: true,
  disableLogger: true,
});

// Export Sentry config if DSN exists, otherwise export normal wrapped config
export default process.env.NEXT_PUBLIC_SENTRY_DSN ? sentryConfig : wrappedConfig;