import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reeva 3.0 - AI Lead Concierge',
  description: 'AI-Powered Car Detailing Lead Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
