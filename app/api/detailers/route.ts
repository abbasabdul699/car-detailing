import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Fetching detailers...')
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        description: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        services: true,
        images: {
          select: {
            url: true,
            alt: true
          }
        }
      }
    })
    
    console.log('Fetched detailers:', detailers)
    
    return NextResponse.json(detailers, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error fetching detailers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailers' },
      { status: 500 }
    )
  }
}