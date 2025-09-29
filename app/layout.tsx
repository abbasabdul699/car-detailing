import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from 'next/script'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import PageTransition from './components/PageTransition'
import { Inter } from 'next/font/google'
import { SessionProvider } from "next-auth/react";
import SessionProviderWrapper from '@/app/components/SessionProviderWrapper';
import { MapLoaderProvider } from '@/app/components/MapLoaderProvider';
import ConditionalNavbar from '@/app/components/ConditionalNavbar';
import ConditionalFooter from '@/app/components/ConditionalFooter';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "ReevaCar - Find Local Car Detailers",
  description: "Find and book professional car detailing services near you. Whether it's a quick wash, deep interior cleaning, or premium protection like ceramic coating, find the right detailer offering exactly what your car needs.",
  metadataBase: new URL('https://www.reevacar.com'),
  keywords: "car detailing, auto detailing, mobile car wash, ceramic coating, paint protection, car cleaning services",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'ReevaCar - Find Local Car Detailers',
    description: 'Find and book professional car detailing services near you',
    url: 'https://www.reevacar.com',
    siteName: 'ReevaCar',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: 'ReevaCar Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReevaCar - Find Local Car Detailers',
    description: 'Find and book professional car detailing services near you',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicons/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicons/safari-pinned-tab.svg',
        color: '#0A2217'
      }
    ]
  },
  manifest: '/manifest.json',
  verification: {
    google: 'your-google-site-verification',
  },
  alternates: {
    canonical: 'https://www.reevacar.com'
  },
  authors: [{ name: 'ReevaCar Team' }],
  creator: 'ReevaCar',
  publisher: 'ReevaCar',
};

// Add JSON-LD structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ReevaCar',
  url: 'https://www.reevacar.com',
  logo: 'https://www.reevacar.com/images/logo.png',
  description: 'Find and book professional car detailing services near you',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '4 Hovendon Ave',
    addressLocality: 'Brockton',
    addressRegion: 'MA',
    postalCode: '02302',
    addressCountry: 'US'
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-508-269-1837',
    contactType: 'customer service'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.className} antialiased min-h-screen flex flex-col`}>
        <PageTransition />
        <ConditionalNavbar />
        <SessionProviderWrapper>
          <MapLoaderProvider>
            <main className="flex-grow">
              {children}
            </main>
          </MapLoaderProvider>
        </SessionProviderWrapper>
        <ConditionalFooter />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
