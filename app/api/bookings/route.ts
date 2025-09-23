import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to refresh Google Calendar access token
async function refreshGoogleCalendarToken(refreshToken: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google Calendar token:', error);
    throw error;
  }
}

// Helper function to create Google Calendar event
async function createGoogleCalendarEvent(accessToken: string, booking: any, detailer: any) {
  try {
    const startDateTime = new Date(booking.scheduledDate);
    if (booking.scheduledTime) {
      const [hours, minutes] = booking.scheduledTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (booking.duration || 120)); // Default 2 hours

    const event = {
      summary: `Car Detailing - ${booking.customerName || 'Customer'}`,
      description: `
Services: ${booking.services.join(', ')}
Customer: ${booking.customerName || 'N/A'}
Phone: ${booking.customerPhone}
Email: ${booking.customerEmail || 'N/A'}
Vehicle: ${booking.vehicleType || 'N/A'}
Location: ${booking.vehicleLocation || 'N/A'}
Notes: ${booking.notes || 'N/A'}
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York', // Adjust based on detailer's timezone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: booking.customerEmail ? [
        {
          email: booking.customerEmail,
          displayName: booking.customerName || 'Customer'
        }
      ] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.id; // Return the Google Calendar event ID
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

// GET /api/bookings - Get bookings for a detailer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailerId = searchParams.get('detailerId');
    const status = searchParams.get('status');

    if (!detailerId) {
      return NextResponse.json({ error: 'Detailer ID is required' }, { status: 400 });
    }

    const whereClause: any = { detailerId };
    if (status) {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        detailer: {
          select: {
            businessName: true,
            phone: true,
            twilioPhoneNumber: true
          }
        },
        conversation: {
          select: {
            customerName: true,
            customerPhone: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      detailerId,
      customerPhone,
      customerName,
      customerEmail,
      vehicleType,
      vehicleLocation,
      services,
      scheduledDate,
      scheduledTime,
      duration,
      notes,
      conversationId
    } = body;

    if (!detailerId || !customerPhone || !scheduledDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: detailerId, customerPhone, scheduledDate' 
      }, { status: 400 });
    }

    // Get detailer info for Google Calendar integration
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAppointments: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        detailerId,
        conversationId,
        customerPhone,
        customerName,
        customerEmail,
        vehicleType,
        vehicleLocation,
        services: services || [],
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration: duration || 120, // Default 2 hours
        notes,
        status: 'pending'
      }
    });

    // If Google Calendar is connected and sync is enabled, create calendar event
    let googleEventId = null;
    if (detailer.googleCalendarConnected && detailer.syncAppointments && detailer.googleCalendarTokens && detailer.googleCalendarRefreshToken) {
      try {
        const tokens = JSON.parse(detailer.googleCalendarTokens);
        let accessToken = tokens.access_token;

        // Try to create Google Calendar event
        try {
          googleEventId = await createGoogleCalendarEvent(accessToken, booking, detailer);
        } catch (error) {
          // If access token is expired, try to refresh it
          console.log('Access token expired, refreshing...');
          accessToken = await refreshGoogleCalendarToken(detailer.googleCalendarRefreshToken);
          
          // Update the stored tokens
          const updatedTokens = {
            ...tokens,
            access_token: accessToken,
          };
          
          await prisma.detailer.update({
            where: { id: detailerId },
            data: {
              googleCalendarTokens: JSON.stringify(updatedTokens),
            },
          });

          // Retry creating Google Calendar event
          googleEventId = await createGoogleCalendarEvent(accessToken, booking, detailer);
        }

        // Update booking with Google Calendar event ID
        await prisma.booking.update({
          where: { id: booking.id },
          data: { googleEventId }
        });

        console.log('Google Calendar event created:', googleEventId);
      } catch (error) {
        console.error('Failed to create Google Calendar event:', error);
        // Don't fail the booking creation if Google Calendar fails
      }
    }

    // Send booking confirmation SMS with opt-out reminder
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const confirmationMessage = `Booking confirmed! ${detailer.businessName} - ${new Date(scheduledDate).toLocaleDateString()}${scheduledTime ? ` at ${scheduledTime}` : ''}. Services: ${(services || []).join(', ')}. Reply STOP to opt out.`;
      
      await client.messages.create({
        to: customerPhone,
        from: detailer.twilioPhoneNumber,
        body: confirmationMessage
      });
    } catch (smsError) {
      console.error('Failed to send booking confirmation SMS:', smsError);
      // Don't fail the booking creation if SMS fails
    }

    return NextResponse.json({ 
      success: true,
      booking: {
        ...booking,
        googleEventId
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings - Update a booking
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, status, notes, ...updateData } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        notes,
        ...updateData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}