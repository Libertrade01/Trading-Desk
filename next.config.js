/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
    return config;
  },
  async rewrites() {
    return [
      { source: '/analytics', destination: '/analytics.html' },
    ];
  },
}

module.exports = nextConfig
