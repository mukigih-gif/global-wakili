import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Force all React resolution to apps/web/node_modules/react (18.3.1).
  // The monorepo root has React 19 which conflicts with the app's React 18,
  // causing the styled-jsx dual-instance SSR crash.
  webpack(config) {
    const webReact    = path.resolve(__dirname, 'node_modules/react');
    const webReactDom = path.resolve(__dirname, 'node_modules/react-dom');
    config.resolve.alias = {
      ...config.resolve.alias,
      react:                   webReact,
      'react-dom':             webReactDom,
      'react/jsx-runtime':     path.resolve(webReact,    'jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(webReact,    'jsx-dev-runtime'),
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
