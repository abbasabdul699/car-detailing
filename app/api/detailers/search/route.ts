import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')

    console.log('Search coordinates:', { lat, lng })

    const detailers = await prisma.detailer.findMany({
      where: { hidden: false },
      include: {
        services: { include: { service: true } },
        images: true
      }
    })
    console.log('Found detailers:', detailers)

    if (!detailers.length) {
      return NextResponse.json([])
    }

    const detailersWithDistance = detailers.map(detailer => {
      const distance = calculateDistance(
        lat,
        lng,
        detailer.latitude,
        detailer.longitude
      )

      return {
        id: detailer.id,
        businessName: detailer.businessName,
        description: detailer.description,
        priceRange: detailer.priceRange,
        address: detailer.address,
        city: detailer.city,
        state: detailer.state,
        latitude: detailer.latitude,
        longitude: detailer.longitude,
        images: detailer.images,
        services: detailer.services,
        distance: parseFloat(distance.toFixed(1))
      }
    })

    detailersWithDistance.sort((a, b) => a.distance - b.distance)

    return NextResponse.json(detailersWithDistance)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json([])
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3963 // Radius of the earth in miles
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
} 