/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
