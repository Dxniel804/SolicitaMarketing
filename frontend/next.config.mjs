/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
