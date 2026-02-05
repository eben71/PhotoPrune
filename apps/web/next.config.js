/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@photoprune/shared'],
  typedRoutes: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'googleusercontent.com' }
    ],
    unoptimized: true // ✅ disables /_next/image optimizer; Image behaves like <img>
  },
  experimental: {
    typedRoutes: true
  }
};

module.exports = nextConfig;
