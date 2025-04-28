import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

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
    });

    let sortedDetailers = detailers;

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      sortedDetailers = detailers
        .map(d => ({
          ...d,
          distance: haversineDistance(userLat, userLng, d.latitude, d.longitude)
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    return NextResponse.json(sortedDetailers, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching detailers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailers' },
      { status: 500 }
    )
  }
}