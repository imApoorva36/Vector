import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Optional deps from RainbowKit/Wagmi (React Native, pino-pretty); not needed in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push("pino-pretty");
    }
    return config;
  },
};

export default nextConfig;
