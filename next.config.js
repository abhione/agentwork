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
  // Box Claws access goes through the auth-gated server proxy at
  // /api/boxclaws/* (app/api/boxclaws/[...path]/route.ts) so the platform
  // Anthropic key is injected server-side and never reaches the client.
};

module.exports = nextConfig;
