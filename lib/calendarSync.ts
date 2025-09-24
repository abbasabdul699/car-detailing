import { prisma } from '@/lib/prisma';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  allDay: boolean;
  color: string;
  description?: string;
  location?: string;
  customerName?: string;
  customerPhone?: string;
  services?: string[];
}

export async function createCalendarEvent(
  detailerId: string,
  booking: any
): Promise<CalendarEvent> {
  // Create calendar event in our system
  const event = await prisma.event.create({
    data: {
      detailerId,
      title: `${booking.customerName} - ${booking.services?.join(', ') || 'Car Detailing'}`,
      date: booking.scheduledDate,
      time: booking.scheduledTime || '10:00 AM',
      allDay: false,
      color: 'blue',
      description: `Customer: ${booking.customerName}\nPhone: ${booking.customerPhone}\nVehicle: ${booking.vehicleType}\nLocation: ${booking.vehicleLocation}\nServices: ${booking.services?.join(', ') || 'N/A'}`,
      location: booking.vehicleLocation,
      bookingId: booking.id
    }
  });

  return {
    id: event.id,
    title: event.title,
    date: event.date.toISOString().split('T')[0],
    time: event.time,
    allDay: event.allDay,
    color: event.color,
    description: event.description,
    location: event.location,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    services: booking.services
  };
}

export async function syncToGoogleCalendar(
  detailerId: string,
  event: CalendarEvent
): Promise<string | null> {
  try {
    // Check if detailer has Google Calendar connected
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true
      }
    });

    if (!detailer?.googleCalendarConnected || !detailer.googleCalendarTokens) {
      console.log('Google Calendar not connected for detailer:', detailerId);
      return null;
    }

    // Refresh Google Calendar token if needed
    const accessToken = await refreshGoogleCalendarToken(detailer.googleCalendarRefreshToken);
    if (!accessToken) {
      console.log('Failed to refresh Google Calendar token');
      return null;
    }

    // Create Google Calendar event
    const googleEvent = await createGoogleCalendarEvent(accessToken, event);
    if (googleEvent) {
      // Update our event with Google Calendar ID
      await prisma.event.update({
        where: { id: event.id },
        data: { googleEventId: googleEvent.id }
      });
      
      console.log('Google Calendar event created:', googleEvent.id);
      return googleEvent.id;
    }

    return null;
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return null;
  }
}

async function refreshGoogleCalendarToken(refreshToken: string): Promise<string | null> {
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
      console.error('Failed to refresh Google Calendar token:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google Calendar token:', error);
    return null;
  }
}

async function createGoogleCalendarEvent(accessToken: string, event: CalendarEvent): Promise<any> {
  try {
    const startDateTime = new Date(`${event.date}T${event.time || '10:00:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: event.customerPhone ? [{
        email: `${event.customerPhone}@sms.local`, // SMS contact
        displayName: event.customerName,
      }] : [],
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    });

    if (!response.ok) {
      console.error('Failed to create Google Calendar event:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}
