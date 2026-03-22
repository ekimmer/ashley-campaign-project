/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static prerendering during build (pages need runtime env vars)
  output: undefined,
  experimental: {},
};

export default nextConfig;
