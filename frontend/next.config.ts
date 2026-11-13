import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.4"],
  devIndicators: false,
  output: "standalone",
  async headers() {
    return [{
      source: "/assets/optimized/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
