import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, action } = body; // action: 'confirm' or 'cancel'

    if (!bookingId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get booking with detailer info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        detailer: {
          select: {
            businessName: true,
            twilioPhoneNumber: true,
            googleCalendarConnected: true,
            syncAppointments: true,
            googleCalendarTokens: true,
            googleCalendarRefreshToken: true
          }
        },
        conversation: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Update booking status
    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus }
    });

    // Send confirmation/cancellation message
    let message = '';
    if (action === 'confirm') {
      message = `Great! Your appointment with ${booking.detailer.businessName} is confirmed for ${booking.scheduledDate.toLocaleDateString()}${booking.scheduledTime ? ` at ${booking.scheduledTime}` : ''}. Services: ${booking.services.join(', ')}. We'll see you then!`;
    } else {
      message = `Your appointment with ${booking.detailer.businessName} has been cancelled. If you'd like to reschedule, please let us know!`;
    }

    // Send SMS notification
    await client.messages.create({
      to: booking.customerPhone,
      from: booking.detailer.twilioPhoneNumber,
      body: message
    });

    // If booking is confirmed and Google Calendar is connected, update the event
    if (action === 'confirm' && booking.googleEventId && booking.detailer.googleCalendarConnected) {
      try {
        // Update Google Calendar event status (add confirmation note)
        const tokens = JSON.parse(booking.detailer.googleCalendarTokens!);
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.googleEventId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: `CONFIRMED - ${booking.notes || ''}\n\nCustomer confirmed via SMS.`,
              colorId: '2' // Green color for confirmed events
            }),
          }
        );

        if (response.ok) {
          console.log('Google Calendar event updated with confirmation');
        }
      } catch (error) {
        console.error('Failed to update Google Calendar event:', error);
      }
    }

    return NextResponse.json({ 
      success: true,
      status: newStatus,
      message
    });

  } catch (error) {
    console.error('Booking confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
