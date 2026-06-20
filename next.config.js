/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  webpack: (config) => {
    config.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
    return config;
  },
}

module.exports = nextConfig
