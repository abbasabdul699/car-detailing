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

function checkBusinessHours(businessHours: any, date: string, time: string): boolean {
  try {
    console.log('Checking business hours:', { businessHours, date, time });
    
    if (!businessHours) {
      console.log('No business hours set, assuming available');
      return true; // If no business hours set, assume always available
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[dayOfWeek];
    
    console.log('Day of week:', dayOfWeek, 'Day name:', dayName);

    // Get business hours for this day
    const dayHours = businessHours[dayName];
    console.log('Day hours for', dayName, ':', dayHours);
    
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length === 0) {
      console.log('No hours set for this day, returning false');
      return false; // No hours set for this day
    }

    // Parse the requested time
    const [hours, minutes] = time.split(':').map(Number);
    const requestedTime = hours * 60 + minutes; // Convert to minutes since midnight
    console.log('Requested time in minutes:', requestedTime);

    // Check if the requested time falls within any of the business hour ranges
    for (let i = 0; i < dayHours.length - 1; i += 2) {
      const startTime = dayHours[i];
      const endTime = dayHours[i + 1];
      
      console.log(`Checking range ${i/2 + 1}: ${startTime} - ${endTime}`);
      
      if (!startTime || !endTime) {
        console.log('Skipping range due to missing start/end time');
        continue;
      }

      // Parse business hours (format: "21:00" -> 21*60 + 0 = 1260 minutes)
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const businessStart = startHour * 60 + startMin;
      const businessEnd = endHour * 60 + endMin;
      
      console.log(`Business range: ${businessStart} - ${businessEnd} minutes`);

      // Check if requested time is within this range
      if (requestedTime >= businessStart && requestedTime <= businessEnd) {
        console.log('Time is within business hours');
        return true;
      }
    }

    console.log('Time is not within any business hour range');
    return false; // Not within any business hour range

  } catch (error) {
    console.error('Business hours check error:', error);
    return true; // If error, assume available
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
