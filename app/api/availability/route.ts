import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to check if a time is within business hours
function isWithinBusinessHours(date: Date, businessHours: any): boolean {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // monday, tuesday, etc.
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

// Helper function to refresh Google Calendar token
async function refreshGoogleCalendarToken(refreshToken: string): Promise<string> {
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

// Helper function to fetch Google Calendar events
async function fetchGoogleCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailerId = searchParams.get('detailerId');
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const duration = parseInt(searchParams.get('duration') || '120'); // minutes

    if (!detailerId) {
      return NextResponse.json({ error: 'Missing detailerId' }, { status: 400 });
    }

    // Get detailer with business hours and calendar info
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        id: true,
        businessName: true,
        businessHours: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAvailability: true,
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Generate time slots for the day (every 30 minutes)
    const timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(targetDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Check if this slot is within business hours
        const isWithinHours = isWithinBusinessHours(slotTime, detailer.businessHours);
        
        if (isWithinHours) {
          timeSlots.push({
            time: slotTime.toISOString(),
            timeString: slotTime.toTimeString().slice(0, 5),
            available: true, // Will be updated based on calendar events
            withinBusinessHours: true
          });
        }
      }
    }

    // If Google Calendar is connected, check for conflicts
    if (detailer.googleCalendarConnected && detailer.syncAvailability && detailer.googleCalendarTokens) {
      try {
        const tokens = JSON.parse(detailer.googleCalendarTokens);
        let accessToken = tokens.access_token;

        // Try to fetch events
        try {
          const events = await fetchGoogleCalendarEvents(accessToken, startOfDay.toISOString(), endOfDay.toISOString());
          
          // Mark slots as unavailable if they conflict with calendar events
          timeSlots.forEach(slot => {
            const slotStart = new Date(slot.time);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            
            const hasConflict = events.some((event: any) => {
              const eventStart = new Date(event.start.dateTime || event.start.date);
              const eventEnd = new Date(event.end.dateTime || event.end.date);
              
              return (
                (slotStart >= eventStart && slotStart < eventEnd) ||
                (slotEnd > eventStart && slotEnd <= eventEnd) ||
                (slotStart <= eventStart && slotEnd >= eventEnd)
              );
            });
            
            if (hasConflict) {
              slot.available = false;
            }
          });
        } catch (error) {
          // If access token is expired, try to refresh it
          console.log('Access token expired, refreshing...');
          accessToken = await refreshGoogleCalendarToken(detailer.googleCalendarRefreshToken!);
          
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

          // Retry fetching events
          const events = await fetchGoogleCalendarEvents(accessToken, startOfDay.toISOString(), endOfDay.toISOString());
          
          // Mark slots as unavailable if they conflict with calendar events
          timeSlots.forEach(slot => {
            const slotStart = new Date(slot.time);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            
            const hasConflict = events.some((event: any) => {
              const eventStart = new Date(event.start.dateTime || event.start.date);
              const eventEnd = new Date(event.end.dateTime || event.end.date);
              
              return (
                (slotStart >= eventStart && slotStart < eventEnd) ||
                (slotEnd > eventStart && slotEnd <= eventEnd) ||
                (slotStart <= eventStart && slotEnd >= eventEnd)
              );
            });
            
            if (hasConflict) {
              slot.available = false;
            }
          });
        }
      } catch (error) {
        console.error('Failed to check Google Calendar availability:', error);
        // Continue with business hours only if calendar check fails
      }
    }

    // Filter to only available slots
    const availableSlots = timeSlots.filter(slot => slot.available);

    return NextResponse.json({
      detailerId,
      date: targetDate.toISOString().split('T')[0],
      businessHours: detailer.businessHours,
      calendarConnected: detailer.googleCalendarConnected,
      availableSlots: availableSlots.map(slot => ({
        time: slot.time,
        timeString: slot.timeString,
        available: slot.available
      })),
      totalSlots: timeSlots.length,
      availableCount: availableSlots.length
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
