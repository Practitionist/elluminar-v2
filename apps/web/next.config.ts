import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@elluminar/db",
    "@elluminar/domain-commerce",
    "@elluminar/domain-artifacts",
    "@elluminar/domain-ai-mentorship",
  ],
};

export default nextConfig;
