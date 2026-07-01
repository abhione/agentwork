/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Proxy to Box Claws API (avoids CORS / hardcoded hosts)
        source: '/boxapi/:path*',
        destination: 'http://localhost:3457/api/:path*',
      },
      {
        source: '/boxhealth',
        destination: 'http://localhost:3457/health',
      },
    ];
  },
};

module.exports = nextConfig;
