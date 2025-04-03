import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    console.log('Database URL:', process.env.DATABASE_URL?.split('@')[1]) // Log URL safely
    console.log('Attempting database connection...')
    
    await prisma.$connect()
    console.log('Successfully connected to database')
    
    const count = await prisma.detailer.count()
    console.log('Total detailers in database:', count)
    
    const detailers = await prisma.detailer.findMany()
    console.log('Fetched detailers:', detailers.length)

    if (!detailers || detailers.length === 0) {
      return NextResponse.json({ 
        message: 'No detailers found in database',
        databaseConnected: true,
        totalCount: count
      }, { status: 404 })
    }

    return NextResponse.json(detailers)
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch detailers',
      details: error.message,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
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