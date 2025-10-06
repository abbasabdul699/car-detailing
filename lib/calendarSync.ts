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
    time: event.time || undefined,
    allDay: event.allDay,
    color: event.color,
    description: event.description || undefined,
    location: event.location || undefined,
    customerName: booking.customerName || undefined,
    customerPhone: booking.customerPhone || undefined,
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
    if (!detailer.googleCalendarRefreshToken) {
      console.log('No refresh token available');
      return null;
    }
    
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

export async function updateGoogleCalendarEvent(
  googleEventId: string,
  updateData: any
): Promise<boolean> {
  try {
    // Get detailer info to access Google Calendar tokens
    const detailer = await prisma.detailer.findFirst({
      where: {
        events: {
          some: { googleEventId }
        }
      },
      select: {
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true
      }
    });

    if (!detailer?.googleCalendarConnected || !detailer.googleCalendarTokens) {
      console.log('Google Calendar not connected for detailer');
      return false;
    }

    // Refresh Google Calendar token if needed
    if (!detailer.googleCalendarRefreshToken) {
      console.log('No refresh token available');
      return false;
    }
    
    const accessToken = await refreshGoogleCalendarToken(detailer.googleCalendarRefreshToken);
    if (!accessToken) {
      console.log('Failed to refresh Google Calendar token');
      return false;
    }

    // Prepare update data for Google Calendar
    const googleUpdateData: any = {};
    
    if (updateData.title) {
      googleUpdateData.summary = updateData.title;
    }
    
    if (updateData.description) {
      googleUpdateData.description = updateData.description;
    }
    
    if (updateData.location) {
      googleUpdateData.location = updateData.location;
    }
    
    if (updateData.date || updateData.time) {
      // Parse the date and time properly
      let startDateTime;
      const dateStr = updateData.date ? updateData.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const timeStr = updateData.time || '10:00 AM';
      
      // Parse time in format like "10:00 AM" or "10:00"
      const cleanTime = timeStr.replace(/\s*(AM|PM)\s*/i, '');
      const [hours, minutes] = cleanTime.split(':').map(Number);
      let hour24 = hours;
      
      // Convert to 24-hour format if needed
      if (timeStr.toLowerCase().includes('pm') && hours !== 12) {
        hour24 = hours + 12;
      } else if (timeStr.toLowerCase().includes('am') && hours === 12) {
        hour24 = 0;
      }
      
      startDateTime = new Date(`${dateStr}T${hour24.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
      
      googleUpdateData.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York',
      };
      googleUpdateData.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      };
    }

    // Update Google Calendar event
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleUpdateData),
    });

    if (!response.ok) {
      console.error('Failed to update Google Calendar event:', response.statusText);
      return false;
    }

    console.log('Google Calendar event updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return false;
  }
}

async function createGoogleCalendarEvent(accessToken: string, event: CalendarEvent): Promise<any> {
  try {
    // Parse the date and time properly
    let startDateTime;
    if (event.time) {
      // Parse time in format like "10:00 AM" or "10:00"
      const timeStr = event.time.replace(/\s*(AM|PM)\s*/i, '');
      const [hours, minutes] = timeStr.split(':').map(Number);
      let hour24 = hours;
      
      // Convert to 24-hour format if needed
      if (event.time.toLowerCase().includes('pm') && hours !== 12) {
        hour24 = hours + 12;
      } else if (event.time.toLowerCase().includes('am') && hours === 12) {
        hour24 = 0;
      }
      
      // Create date in local timezone to avoid UTC conversion issues
      const dateStr = event.date.includes('T') ? event.date.split('T')[0] : event.date;
      startDateTime = new Date(`${dateStr}T${hour24.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}:00`);
    } else {
      // Default to 10:00 AM
      const dateStr = event.date.includes('T') ? event.date.split('T')[0] : event.date;
      startDateTime = new Date(`${dateStr}T10:00:00`);
    }
    
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
