/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.reevacar.com',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    additionalSitemaps: [
      'https://www.reevacar.com/sitemap.xml',
    ],
  },
  exclude: ['/404', '/500', '/api/*'], // Add any pages you want to exclude from sitemap
  changefreq: 'daily',
  priority: 0.7,
} 