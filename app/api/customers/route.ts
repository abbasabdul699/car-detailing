import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailerId = searchParams.get('detailerId')
    
    if (!detailerId) {
      return NextResponse.json({ error: 'detailerId is required' }, { status: 400 })
    }

    const customers = await prisma.customer.findMany({
      where: { detailerId },
      include: {
        bookings: {
          orderBy: { scheduledDate: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      detailerId,
      name,
      phone,
      email,
      address,
      locationType,
      vehicleInfo,
      preferredTime,
      flexibility,
      tags = []
    } = body

    if (!detailerId || !name || !phone) {
      return NextResponse.json({ 
        error: 'detailerId, name, and phone are required' 
      }, { status: 400 })
    }

    const customer = await prisma.customer.upsert({
      where: {
        detailerId_phone: { detailerId, phone }
      },
      update: {
        name,
        email,
        address,
        locationType,
        vehicleInfo,
        preferredTime,
        flexibility,
        tags,
        updatedAt: new Date()
      },
      create: {
        detailerId,
        name,
        phone,
        email,
        address,
        locationType,
        vehicleInfo,
        preferredTime,
        flexibility,
        tags
      }
    })

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error creating/updating customer:', error)
    return NextResponse.json({ error: 'Failed to create/update customer' }, { status: 500 })
  }
}
