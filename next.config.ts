/** @type {import('next').NextConfig} */
import { NextConfig } from 'next';

const config: NextConfig = {
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
    domains: [
      'localhost', 
      'vercel.app',
      'reevacar.s3.us-east-2.amazonaws.com',
      'maps.googleapis.com',
      'maps.gstatic.com'
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        pathname: '/maps/api/staticmap/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.gstatic.com',
        pathname: '/mapfiles/api-3/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
}

export default config