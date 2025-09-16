import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from 'next-auth/react';

export async function POST(request: Request) {
  try {
    const { detailerId, date, status, price, userId } = await request.json();

    if (!detailerId || !date || !status || !price || !userId) {
        return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        detailerId,
        date: new Date(date),
        status,
        price,
        userId
      }
    });

    // Fetch the user's name for the notification message
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'A new customer';

    // Create a notification for the detailer
    await prisma.notification.create({
      data: {
        detailerId,
        message: `You have a new booking from ${userName}.`,
        type: 'NEW_BOOKING',
        link: `/detailer-dashboard/bookings`, // Link to the bookings page
      },
    });

    return NextResponse.json({ bookingId: booking.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
