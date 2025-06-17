import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // You can add more fields as needed
    const booking = await prisma.booking.create({
      data: {
        detailerId: data.detailerId,
        // ...other booking fields (date, time, user info, etc.)
      }
    });
    return NextResponse.json({ bookingId: booking.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
