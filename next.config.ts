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
    domains: ['localhost', 'vercel.app', 'v0-new-project-9gt88cvgpfw-3bciba6tv.vercel.app'],
    unoptimized: true
  },
  experimental: {
    missingSuspenseWithCSRBailout: false
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/car-detailing' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/car-detailing' : ''
}

module.exports = nextConfig