import { NextResponse } from 'next/server'
import { calculateDistance } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

// Add caching headers
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    // Add debug logging
    console.log('Starting detailer fetch...')

    // Check if we have any users in the database
    const users = await prisma.user.findMany({
      where: {
        role: 'DETAILER'
      }
    })

    console.log('Found users:', users) // Debug log

    // If no users found, return empty array instead of error
    if (!users || users.length === 0) {
      console.log('No detailers found')
      return NextResponse.json([])
    }

    // Map the users to include only the fields we need
    const detailers = users.map(user => ({
      id: user.id,
      businessName: user.businessName || '',
      priceRange: user.priceRange || 'Contact for pricing',
      description: user.description || '',
      images: user.images || [],
      latitude: user.latitude || null,
      longitude: user.longitude || null,
    }))

    console.log('Returning detailers:', detailers) // Debug log
    return NextResponse.json(detailers)

  } catch (error) {
    // Log the full error for debugging
    console.error('Database error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch detailers' },
      { status: 500 }
    )
  }
} 