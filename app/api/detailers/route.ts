import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    // Log the connection attempt
    console.log('Attempting database connection...')
    console.log('Database URL exists:', !!process.env.DATABASE_URL)

    // Test the connection
    await prisma.$connect()
    console.log('Successfully connected to database')

    // Fetch detailers
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

    console.log('Number of detailers found:', detailers.length)

    if (!detailers || detailers.length === 0) {
      return NextResponse.json(
        { error: 'No detailers found in database' },
        { status: 404 }
      )
    }

    return NextResponse.json(detailers)
  } catch (error) {
    // Log the full error
    console.error('Database Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch detailers from database',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  } finally {
    // Always disconnect
    await prisma.$disconnect()
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