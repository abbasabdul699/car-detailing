import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ detailerId: string }> }
) {
  try {
    const { detailerId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');


    if (!detailerId) {
      return NextResponse.json({ error: 'Missing detailerId' }, { status: 400 });
    }

    // Build where clause
    const whereClause: any = {
      detailerId: detailerId
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // First, auto-complete any confirmed bookings where the date has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    await prisma.booking.updateMany({
      where: {
        detailerId: detailerId,
        status: 'confirmed',
        scheduledDate: {
          lt: today
        }
      },
      data: {
        status: 'completed'
      }
    });

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        customerPhone: true,
        customerName: true,
        customerEmail: true,
        vehicleType: true,
        vehicleLocation: true,
        services: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        notes: true,
        createdAt: true,
        conversationId: true
      }
    });


    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching detailer bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}