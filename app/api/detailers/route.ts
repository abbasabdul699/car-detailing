import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    // Log connection attempt
    console.log('Attempting to connect to database...')
    
    // Test connection
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Attempt to fetch detailers
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        priceRange: true,
        images: true,
        latitude: true,
        longitude: true,
      }
    })
    
    console.log('Fetched detailers:', detailers)

    if (!detailers || detailers.length === 0) {
      console.log('No detailers found in database')
      return NextResponse.json({ 
        error: 'No detailers found',
        databaseConnected: true 
      }, { status: 404 })
    }

    return NextResponse.json(detailers)
  } catch (error) {
    console.error('Detailed error:', error)
    return NextResponse.json({
      error: 'Failed to fetch detailers',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  } finally {
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