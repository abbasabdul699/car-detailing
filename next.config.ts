/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add this section
  compiler: {
    styledComponents: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['your-image-domain.com'], // Add your image domains here
  },
}

module.exports = nextConfig