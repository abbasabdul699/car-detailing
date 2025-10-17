import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

// Helper function to fetch events from Google Calendar
async function fetchGoogleCalendarEvents(accessToken: string, timeMin?: string, timeMax?: string) {
  try {
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    // Get detailer with Google Calendar tokens
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { 
        id: true, 
        businessName: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAppointments: true,
        syncAvailability: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    let events = [];
    let localEvents = [];

    // First, fetch local events and bookings from our database
    try {
      const [events, bookings] = await Promise.all([
        prisma.event.findMany({
          where: { detailerId },
          orderBy: { date: 'asc' }
        }),
        prisma.booking.findMany({
          where: { detailerId },
          orderBy: { scheduledDate: 'asc' }
        })
      ]);

      // Transform local events to match calendar format
      const transformedEvents = events.map((event: any) => {
        const eventDate = new Date(event.date);
        
        // Handle time parsing more safely
        let startDateTime, endDateTime;
        
        if (event.time) {
          // Parse time more carefully - convert 12-hour to 24-hour format
          let timeStr = event.time;
          
          // Convert 12-hour format to 24-hour format
          if (timeStr.includes('PM') || timeStr.includes('AM')) {
            const isPM = timeStr.includes('PM');
            const timeOnly = timeStr.replace(/\s*(AM|PM)/i, '').trim();
            const [hours, minutes] = timeOnly.split(':').map(Number);
            
            let hour24 = hours;
            if (isPM && hours !== 12) {
              hour24 = hours + 12;
            } else if (!isPM && hours === 12) {
              hour24 = 0;
            }
            
            timeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          } else if (!timeStr.includes(':')) {
            timeStr = `${timeStr}:00`;
          }
          
          // Use UTC date string to avoid timezone issues
          const dateStr = eventDate.getUTCFullYear() + '-' + 
            String(eventDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(eventDate.getUTCDate()).padStart(2, '0');
          startDateTime = new Date(`${dateStr}T${timeStr}`);
          
          // If time parsing fails, fall back to event date
          if (isNaN(startDateTime.getTime())) {
            startDateTime = eventDate;
          }
        } else {
          startDateTime = eventDate;
        }
        
        // Calculate end time
        if (event.time && !isNaN(startDateTime.getTime())) {
          endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
        } else {
          endDateTime = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours later for all-day
        }

        return {
          id: event.id,
          title: event.title,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          date: event.date.toISOString().split('T')[0],
          time: event.time,
          allDay: event.allDay,
          color: event.color,
          description: event.description || '',
          location: event.location || '',
          source: 'local',
          bookingId: event.bookingId
        };
      });

      // Transform bookings to match calendar format
      const transformedBookings = bookings.map((booking: any) => {
        const bookingDate = new Date(booking.scheduledDate);
        
        // Handle time parsing for bookings
        let startDateTime, endDateTime;
        
        if (booking.scheduledTime) {
          // Parse time more carefully - convert 12-hour to 24-hour format
          let timeStr = booking.scheduledTime;
          
          // Convert 12-hour format to 24-hour format
          if (timeStr.includes('PM') || timeStr.includes('AM')) {
            const isPM = timeStr.includes('PM');
            const timeOnly = timeStr.replace(/\s*(AM|PM)/i, '').trim();
            const timeParts = timeOnly.split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
            
            let hour24 = hours;
            if (isPM && hours !== 12) {
              hour24 = hours + 12;
            } else if (!isPM && hours === 12) {
              hour24 = 0;
            }
            
            timeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          } else if (!timeStr.includes(':')) {
            timeStr = `${timeStr}:00`;
          }
          
          // Use UTC date string to avoid timezone issues
          const dateStr = bookingDate.getUTCFullYear() + '-' + 
            String(bookingDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(bookingDate.getUTCDate()).padStart(2, '0');
          startDateTime = new Date(`${dateStr}T${timeStr}`);
          
          // If time parsing fails, fall back to booking date
          if (isNaN(startDateTime.getTime())) {
            startDateTime = bookingDate;
          }
        } else {
          startDateTime = bookingDate;
        }
        
        // Calculate end time (default 2 hours for bookings)
        endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

        return {
          id: booking.id,
          title: `${booking.customerName || 'Customer'} - ${Array.isArray(booking.services) ? booking.services.join(', ') : booking.services || 'Detailing'}`,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          date: bookingDate.getUTCFullYear() + '-' + 
            String(bookingDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(bookingDate.getUTCDate()).padStart(2, '0'),
          time: booking.scheduledTime,
          allDay: false, // Bookings are never all-day
          color: booking.status === 'confirmed' ? 'green' : booking.status === 'pending' ? 'yellow' : 'red',
          description: `Customer: ${booking.customerName || 'N/A'}\nPhone: ${booking.customerPhone}\nVehicle: ${booking.vehicleType || 'N/A'}\nLocation: ${booking.vehicleLocation || 'N/A'}\nServices: ${Array.isArray(booking.services) ? booking.services.join(', ') : booking.services || 'Detailing'}\nStatus: ${booking.status}\n${booking.notes ? `Notes: ${booking.notes}` : ''}`,
          location: booking.vehicleLocation || '',
          source: 'local-google-synced',
          bookingId: booking.id,
          status: booking.status
        };
      });

      localEvents = [...transformedEvents, ...transformedBookings];
    } catch (error) {
      console.error('Error fetching local events:', error);
      localEvents = [];
    }

    // If Google Calendar is connected and tokens exist, fetch events
    if (detailer.googleCalendarConnected && detailer.googleCalendarTokens && detailer.googleCalendarRefreshToken) {
      try {
        const tokens = JSON.parse(detailer.googleCalendarTokens);
        let accessToken = tokens.access_token;

        // Calculate time range for the requested month
        let timeMin, timeMax;
        if (month) {
          const [year, monthNum] = month.split('-');
          const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
          timeMin = startDate.toISOString();
          timeMax = endDate.toISOString();
        }

        // Try to fetch events with current access token
        try {
          events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
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

          // Retry fetching events with new access token
          events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
        }

        // Transform Google Calendar events to match our calendar format
        // Show all events from Google Calendar (no filtering for now)
        events = events
          .map((event: any) => ({
            id: event.id,
            title: event.summary || 'No Title',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime, // If no time, it's an all-day event
            color: 'blue', // Default color for Google Calendar events
            source: 'google',
            description: event.description || '',
            location: event.location || '',
          }));

        console.log('Sample Google Calendar events after transformation:');
        events.slice(0, 3).forEach((event, index) => {
          console.log(`Event ${index + 1}:`, {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            source: event.source,
            allDay: event.allDay
          });
        });

      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        // Return empty events array if Google Calendar fetch fails
        events = [];
      }
    }

    // Deduplicate events - prioritize local events over Google Calendar events
    // This prevents showing the same event twice when it exists in both calendars
    const eventMap = new Map();
    
    // First, add all local events
    localEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    // Then, add Google Calendar events only if they don't have a corresponding local event
    events.forEach(event => {
      // First, check if any local event has this Google Calendar event ID
      const hasLocalEventWithGoogleId = localEvents.some(localEvent => {
        return localEvent.googleEventId === event.id;
      });
      
      if (hasLocalEventWithGoogleId) {
        console.log(`🔄 Skipping Google Calendar event (has local counterpart): "${event.title}" at ${event.start}`);
        return;
      }
      
      // Fallback: Check by title and time for events without proper googleEventId linkage
      const isDuplicate = localEvents.some(localEvent => {
        const sameTitle = localEvent.title === event.title;
        const sameStartTime = localEvent.start === event.start;
        return sameTitle && sameStartTime;
      });
      
      if (!isDuplicate) {
        eventMap.set(event.id, event);
      } else {
        console.log(`🔄 Skipping duplicate Google Calendar event: "${event.title}" at ${event.start}`);
      }
    });
    
    const allEvents = Array.from(eventMap.values());

    const duplicateCount = localEvents.length + events.length - allEvents.length;
    
    console.log('Calendar Events API Response:');
    console.log('- Local events:', localEvents.length);
    console.log('- Google events:', events.length);
    console.log('- Duplicates removed:', duplicateCount);
    console.log('- Total unique events:', allEvents.length);
    console.log('- Google Calendar connected:', detailer.googleCalendarConnected);
    console.log('- Sync appointments:', detailer.syncAppointments);

    return NextResponse.json({ 
      events: allEvents,
      localEvents,
      googleEvents: events,
      googleCalendarConnected: detailer.googleCalendarConnected || false,
      syncAppointments: detailer.syncAppointments || false,
      syncAvailability: detailer.syncAvailability || false
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
