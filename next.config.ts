import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  output: process.env.HAAT_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
