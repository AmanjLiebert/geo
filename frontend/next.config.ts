import type { NextConfig } from "next";

const apiInternalBaseUrl = (process.env.API_INTERNAL_BASE_URL ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.4"],
  devIndicators: false,
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!apiInternalBaseUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
