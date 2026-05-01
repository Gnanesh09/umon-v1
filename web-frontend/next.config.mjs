/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@coral-xyz/anchor", "@solana/wallet-adapter-react-ui"],
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
