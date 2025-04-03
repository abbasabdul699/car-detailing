import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    console.log('Attempting to connect to database...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.slice(0, 20) + '...') // Only log the start of the URL for security
    
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        priceRange: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
      },
    })
    
    console.log('Detailers found:', detailers.length)
    return NextResponse.json(detailers)
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailers from database', details: error.message },
      { status: 500 }
    )
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