/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add this section
  compiler: {
    styledComponents: true,
  },
}

module.exports = nextConfig