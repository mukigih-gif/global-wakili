import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Force all React imports to resolve to the same instance
  webpack: (config, { isServer }) => {
    const reactPath = require.resolve('react');
    const reactDomPath = require.resolve('react-dom');

    config.resolve.alias = {
      ...config.resolve.alias,
      'react': reactPath,
      'react-dom': reactDomPath,
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:3000'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
