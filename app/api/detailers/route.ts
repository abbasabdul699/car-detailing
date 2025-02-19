import { NextResponse } from 'next/server'
import { calculateDistance } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '42.4440')  // Brockton coordinates
  const lng = parseFloat(searchParams.get('lng') || '-76.5019')
  const radius = parseInt(searchParams.get('radius') || '50')

  try {
    // Fetch all detailers with their coordinates
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        googleRating: true,
        totalReviews: true,
        images: {
          where: {
            isFeatured: true
          },
          take: 1,
          select: {
            url: true,
            alt: true
          }
        },
        services: {
          select: {
            name: true,
            price: true
          }
        }
      }
    })

    console.log('Database detailers:', detailers)

    // Calculate distance and filter by radius
    const nearbyDetailers = detailers
      .map(detailer => ({
        ...detailer,
        distance: calculateDistance(
          { lat, lng },
          { lat: detailer.latitude, lng: detailer.longitude }
        )
      }))
      .filter(detailer => detailer.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    console.log('Filtered nearby detailers:', nearbyDetailers)

    return NextResponse.json(nearbyDetailers, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error fetching detailers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailers' },
      { status: 500 }
    )
  }
} 