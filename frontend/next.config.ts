import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.lajusmart.app";

const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

const nextConfig: NextConfig = {
  // Use standalone output for Docker container only; Vercel handles its own serverless output
  ...(isVercel ? {} : { output: "standalone" }),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/evidence/:path*",
        destination: `${backendUrl}/evidence/:path*`,
      },
    ];
  },
};

export default nextConfig;
