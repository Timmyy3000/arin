import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 15+ defaults staleTimes.dynamic to 0, disabling client Router Cache for dynamic segments.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
