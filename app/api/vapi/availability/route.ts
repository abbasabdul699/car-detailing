import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to check if a time is within business hours
function isWithinBusinessHours(date: Date, businessHours: any): boolean {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // mon, tue, etc.
  const dayHours = businessHours[dayOfWeek];
  
  if (!dayHours || dayHours.length === 0) {
    return false; // Closed on this day
  }
  
  const timeStr = date.toTimeString().slice(0, 5); // HH:MM format
  const [hours, minutes] = timeStr.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  // Check if time falls within any of the business hour ranges
  for (const range of dayHours) {
    const [startTime, endTime] = range;
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;
    
    if (timeInMinutes >= startTimeInMinutes && timeInMinutes <= endTimeInMinutes) {
      return true;
    }
  }
  
  return false;
}

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
        businessName: true,
        businessHours: true,
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

    // Check if the requested time is within business hours
    const requestedDateTime = new Date(`${date}T${time}:00`);
    const isWithinHours = isWithinBusinessHours(requestedDateTime, detailer.businessHours);
    
    if (!isWithinHours) {
      return NextResponse.json({
        available: false,
        reason: `Sorry, ${detailer.businessName} is not available at ${time} on ${date}. Please check our business hours.`,
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
