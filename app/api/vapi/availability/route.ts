import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { detailerId, date, time } = await request.json();

    if (!detailerId || !date || !time) {
      return NextResponse.json({ 
        error: 'Missing required parameters: detailerId, date, time' 
      }, { status: 400 });
    }

    // Get detailer info
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
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

    // Check local bookings first
    const existingBooking = await prisma.booking.findFirst({
      where: {
        detailerId,
        scheduledDate: date,
        scheduledTime: time,
        status: {
          in: ['confirmed', 'pending']
        }
      }
    });

    if (existingBooking) {
      return NextResponse.json({
        available: false,
        reason: 'Time slot already booked',
        existingBooking: {
          customerName: existingBooking.customerName,
          services: existingBooking.services
        }
      });
    }

    // Check Google Calendar if connected
    if (detailer.googleCalendarConnected && detailer.googleCalendarTokens) {
      try {
        const isGoogleCalendarAvailable = await checkGoogleCalendarAvailability(
          detailer.googleCalendarTokens,
          date,
          time
        );

        if (!isGoogleCalendarAvailable) {
          return NextResponse.json({
            available: false,
            reason: 'Time slot blocked in Google Calendar'
          });
        }
      } catch (error) {
        console.error('Google Calendar check error:', error);
        // Continue with local check only if Google Calendar fails
      }
    }

    return NextResponse.json({
      available: true,
      message: 'Time slot is available'
    });

  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check availability' 
    }, { status: 500 });
  }
}

async function checkGoogleCalendarAvailability(
  tokens: string,
  date: string,
  time: string
): Promise<boolean> {
  try {
    const parsedTokens = JSON.parse(tokens);
    const accessToken = parsedTokens.access_token;

    if (!accessToken) {
      return true; // If no access token, assume available
    }

    // Create time range for the requested slot
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const timeMin = startDateTime.toISOString();
    const timeMax = endDateTime.toISOString();

    // Check Google Calendar for conflicts
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Google Calendar API error:', response.status, response.statusText);
      return true; // Assume available if API fails
    }

    const data = await response.json();
    const events = data.items || [];

    // Check if there are any events that would conflict
    const hasConflicts = events.some((event: any) => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      // Check for overlap
      return (eventStart < endDateTime && eventEnd > startDateTime);
    });

    return !hasConflicts;

  } catch (error) {
    console.error('Google Calendar availability check error:', error);
    return true; // Assume available if check fails
  }
}
