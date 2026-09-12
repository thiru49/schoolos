import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@schoolos/api-client",
    "@schoolos/permissions",
    "@schoolos/types",
    "@schoolos/ui",
    "@schoolos/validation",
  ],
};

export default nextConfig;
