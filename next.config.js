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
  async redirects() {
    return [
      {
        source: '/analytics.html',
        has: [{ type: 'query', key: 'view', value: 'reports' }],
        destination: '/analytics?view=reports',
        permanent: true,
      },
      {
        source: '/analytics.html',
        destination: '/analytics',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
