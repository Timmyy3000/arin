import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Client-side Router Cache TTLs. Next 15+ defaults `dynamic` to 0s, which
  // means every back/forward to a previously-visited page refetches the whole
  // segment from the server. 30s/3min restores the snappy back-nav users expect
  // without sacrificing freshness for in-app actions (revalidatePath still wins).
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
