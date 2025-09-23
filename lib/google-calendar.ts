import { google } from 'googleapis';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/detailer/calendar/callback`
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async getEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  async checkAvailability(
    startTime: string,
    endTime: string,
    duration: number = 60 // minutes
  ): Promise<AvailabilitySlot[]> {
    try {
      const events = await this.getEvents(startTime, endTime);
      
      // Convert events to availability slots
      const slots: AvailabilitySlot[] = [];
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Generate 1-hour slots
      for (let time = new Date(start); time < end; time.setHours(time.getHours() + 1)) {
        const slotStart = new Date(time);
        const slotEnd = new Date(time.getTime() + duration * 60000);
        
        // Check if this slot conflicts with any events
        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          
          return (
            (slotStart >= eventStart && slotStart < eventEnd) ||
            (slotEnd > eventStart && slotEnd <= eventEnd) ||
            (slotStart <= eventStart && slotEnd >= eventEnd)
          );
        });
        
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !hasConflict
        });
      }
      
      return slots;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Failed to check availability');
    }
  }

  async createEvent(eventDetails: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }): Promise<CalendarEvent> {
    try {
      const event = {
        summary: eventDetails.summary,
        description: eventDetails.description || '',
        start: {
          dateTime: eventDetails.start,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: eventDetails.end,
          timeZone: 'America/New_York',
        },
        attendees: eventDetails.customerEmail ? [
          { email: eventDetails.customerEmail }
        ] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async getAvailableSlots(
    date: string,
    workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
  ): Promise<string[]> {
    try {
      const startTime = `${date}T${workingHours.start}:00`;
      const endTime = `${date}T${workingHours.end}:00`;
      
      const slots = await this.checkAvailability(startTime, endTime);
      
      return slots
        .filter(slot => slot.available)
        .map(slot => slot.start);
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw new Error('Failed to get available slots');
    }
  }
}
