import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.4"],
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
