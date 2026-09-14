import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.4"],
  devIndicators: false,
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
