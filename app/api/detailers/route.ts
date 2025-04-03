import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    console.log('Fetching detailers from database...')
    const detailers = await prisma.detailer.findMany()
    console.log(`Found ${detailers.length} detailers`)
    return NextResponse.json(detailers)
  } catch (error) {
    console.error('Error fetching detailers:', error)
    return NextResponse.json({ error: 'Failed to fetch detailers' }, { status: 500 })
  }
}

// Example detailer data structure
const detailerExample = {
  businessName: "Premium Auto Detailing",
  description: "Professional car detailing services with over 10 years of experience",
  priceRange: "$150-$500",
  address: "123 Main St, City, State 12345",
  latitude: 37.7749,
  longitude: -122.4194,
  images: [
    {
      url: "/images/detailer1.jpg",
      alt: "Premium Auto Detailing Work"
    }
  ],
  services: [
    {
      name: "Basic Detail",
      price: 150
    },
    {
      name: "Premium Detail",
      price: 300
    }
  ]
} 