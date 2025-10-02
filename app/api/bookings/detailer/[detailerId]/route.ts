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

    // Note: Removed auto-complete logic since we only have 3 statuses now
    // Bookings stay as confirmed/cancelled/rescheduled based on user actions

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