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
        googleCalendarRefreshToken: true,
        businessHours: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ 
        error: 'Detailer not found' 
      }, { status: 404 });
    }

    // Check business hours first
    const isWithinBusinessHours = checkBusinessHours(detailer.businessHours, date, time);
    
    if (!isWithinBusinessHours) {
      return NextResponse.json({
        available: false,
        reason: 'Requested time is outside business hours',
        businessHours: detailer.businessHours
      });
    }

    // Check local bookings first
    // Create a DateTime object for the start and end of the day to check for any bookings
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');
    
    const existingBooking = await prisma.booking.findFirst({
      where: {
        detailerId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay
        },
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
      message: 'Time slot is available',
      businessHours: detailer.businessHours
    });

  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function checkBusinessHours(businessHours: any, date: string, time: string): boolean {
  try {
    if (!businessHours) {
      return false; // If no business hours set, treat as closed
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[dayOfWeek];

    // Get business hours for this day
    const dayHours = businessHours[dayName];
    
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length === 0) {
      return false; // No hours set for this day
    }

    // Parse the requested time
    const [hours, minutes] = time.split(':').map(Number);
    const requestedTime = hours * 60 + minutes; // Convert to minutes since midnight

    // Check if the requested time falls within any of the business hour ranges
    for (let i = 0; i < dayHours.length - 1; i += 2) {
      const startTime = dayHours[i];
      const endTime = dayHours[i + 1];
      
      if (!startTime || !endTime) continue;

      // Parse business hours (format: "21:00" -> 21*60 + 0 = 1260 minutes)
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const businessStart = startHour * 60 + startMin;
      const businessEnd = endHour * 60 + endMin;

      // Check if requested time is within this range
      if (requestedTime >= businessStart && requestedTime <= businessEnd) {
        return true;
      }
    }

    return false; // Not within any business hour range

  } catch (error) {
    console.error('Business hours check error:', error);
    return false; // On error, be conservative and treat as closed
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
