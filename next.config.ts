import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "pdfjs-dist"];
    }
    return config;
  },
};

export default nextConfig;
