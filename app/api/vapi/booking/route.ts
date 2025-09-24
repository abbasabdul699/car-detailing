import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const {
      detailerId,
      customerName,
      customerPhone,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      services,
      scheduledDate,
      scheduledTime,
      address,
      notes
    } = await request.json();

    if (!detailerId || !customerName || !customerPhone || !scheduledDate || !scheduledTime) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Get detailer info
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        id: true,
        businessName: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ 
        error: 'Detailer not found' 
      }, { status: 404 });
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        detailerId: detailer.id,
        customerName,
        customerPhone,
        vehicleMake: vehicleMake || 'Not specified',
        vehicleModel: vehicleModel || 'Not specified',
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        services: Array.isArray(services) ? services.join(', ') : services || 'General service',
        scheduledDate,
        scheduledTime,
        address: address || 'Not provided',
        notes: notes || '',
        status: 'confirmed',
        source: 'voice_ai'
      }
    });

    // Sync to Google Calendar if connected
    let googleEventId = null;
    if (detailer.googleCalendarConnected && detailer.googleCalendarTokens) {
      try {
        googleEventId = await createGoogleCalendarEvent(
          detailer,
          booking
        );
        
        if (googleEventId) {
          // Update booking with Google Calendar event ID
          await prisma.booking.update({
            where: { id: booking.id },
            data: { googleEventId }
          });
        }
      } catch (error) {
        console.error('Google Calendar sync error:', error);
        // Don't fail the booking if Google Calendar sync fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        customerName: booking.customerName,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        services: booking.services,
        googleEventId
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create booking' 
    }, { status: 500 });
  }
}

async function createGoogleCalendarEvent(detailer: any, booking: any): Promise<string | null> {
  try {
    const tokens = JSON.parse(detailer.googleCalendarTokens);
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return null;
    }

    // Create event details
    const startDateTime = new Date(`${booking.scheduledDate}T${booking.scheduledTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const event = {
      summary: `${booking.customerName} - ${booking.services}`,
      description: `
Customer: ${booking.customerName}
Phone: ${booking.customerPhone}
Vehicle: ${booking.vehicleYear} ${booking.vehicleMake} ${booking.vehicleModel}
Services: ${booking.services}
Address: ${booking.address}
${booking.notes ? `Notes: ${booking.notes}` : ''}
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York'
      },
      location: booking.address !== 'Not provided' ? booking.address : undefined
    };

    // Create Google Calendar event
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      console.error('Google Calendar event creation failed:', response.status, response.statusText);
      return null;
    }

    const createdEvent = await response.json();
    console.log('Google Calendar event created:', createdEvent.id);
    
    return createdEvent.id;

  } catch (error) {
    console.error('Google Calendar event creation error:', error);
    return null;
  }
}
