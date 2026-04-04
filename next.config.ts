import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce bundle size by excluding source maps in production
  productionBrowserSourceMaps: false,

  // Compiler optimizations
  compiler: {
    // Remove console.log in production (keep warn/error)
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["warn", "error"] } : false,
  },

  // Webpack bundle optimizations
  webpack(config, { isServer }) {
    if (!isServer) {
      // Ensure @dnd-kit packages are tree-shaken properly
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
};

export default nextConfig;
