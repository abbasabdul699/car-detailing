/**
 * Improved slot computation with Google FreeBusy integration and proper timezone handling
 * Fixes: timezone math, Google Calendar integration, and availability accuracy
 */

import { PrismaClient } from '@prisma/client';
import { DateTime, Interval } from 'luxon';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export interface TimeSlot {
  startISO: string;
  endISO: string;
  startLocal: string;
  endLocal: string;
  label: string;
}

export interface SlotOptions {
  detailerId: string;
  days?: number;
  durationMinutes?: number;
  tz?: string;
  from?: Date;
  to?: Date;
}

/**
 * Get merged free slots using Google FreeBusy API and Reeva bookings
 */
export async function getMergedFreeSlots(
  dayISO: string,
  calendarId: string,
  reevaBookings: { start: string; end: string }[],
  detailerId: string,
  durationMinutes: number = 240,
  stepMinutes: number = 30,
  tz: string = 'America/New_York'
): Promise<TimeSlot[]> {
  try {
    // Get detailer's business hours
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { businessHours: true, googleCalendarTokens: true }
    });

    if (!detailer?.businessHours) {
      console.warn('No business hours found for detailer:', detailerId);
      return [];
    }

    // Determine business window for this day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dateObj = new Date(dayISO + 'T12:00:00'); // Use noon to avoid timezone edge cases
    const dayOfWeek = dayNames[dateObj.getDay()];
    const dayHours = detailer.businessHours[dayOfWeek];

    // Skip if business is closed on this day
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length !== 2) {
      return [];
    }

    const [startTime, endTime] = dayHours;
    
    // Skip if times are empty strings (business is closed)
    if (!startTime || !endTime || startTime === '' || endTime === '') {
      return [];
    }

    // Create business window in the detailer's timezone
    const open = DateTime.fromISO(`${dayISO}T${startTime}`, { zone: tz });
    const close = DateTime.fromISO(`${dayISO}T${endTime}`, { zone: tz });

    console.log(`Business window for ${dayISO}:`, {
      open: open.toISO(),
      close: close.toISO(),
      tz
    });

    // Initialize busy intervals array
    let allBusy: Interval[] = [];

    // Get Google Calendar busy times if connected
    if (detailer.googleCalendarTokens) {
      try {
        const googleBusy = await getGoogleCalendarBusyTimes(
          detailer.googleCalendarTokens,
          calendarId,
          open.toUTC(),
          close.toUTC()
        );
        allBusy = [...allBusy, ...googleBusy];
        console.log(`Found ${googleBusy.length} Google Calendar busy intervals`);
      } catch (error) {
        console.error('Error fetching Google Calendar busy times:', error);
        // Continue without Google Calendar data
      }
    }

    // Add Reeva bookings to busy intervals
    const reevaBusy = reevaBookings.map(booking =>
      Interval.fromDateTimes(
        DateTime.fromISO(booking.start),
        DateTime.fromISO(booking.end)
      )
    );
    allBusy = [...allBusy, ...reevaBusy];
    console.log(`Found ${reevaBusy.length} Reeva booking busy intervals`);

    // Start with business window as free time
    let free = [Interval.fromDateTimes(open, close)];

    // Subtract all busy intervals from free time
    for (const busy of allBusy) {
      free = free.flatMap(f => f.difference(busy));
    }

    console.log(`After subtracting busy times: ${free.length} free intervals`);

    // Generate candidate slots
    const slots: TimeSlot[] = [];
    for (const freeInterval of free) {
      let cursor = freeInterval.start;
      
      while (cursor.plus({ minutes: durationMinutes }).endOf('minute') <= freeInterval.end) {
        const start = cursor;
        const end = cursor.plus({ minutes: durationMinutes });
        
        // Create human-readable label in the detailer's timezone
        const label = `${start.toFormat('cccc, LLL d')} ${start.toFormat('h:mm a')} – ${end.toFormat('h:mm a')} ${tz}`;
        
        slots.push({
          startISO: start.toUTC().toISO(),
          endISO: end.toUTC().toISO(),
          startLocal: start.toFormat('h:mm a'),
          endLocal: end.toFormat('h:mm a'),
          label
        });
        
        cursor = cursor.plus({ minutes: stepMinutes });
      }
    }

    console.log(`Generated ${slots.length} available slots for ${dayISO}`);
    
    // Debug: Log the first few available slots
    if (slots.length > 0) {
      console.log(`🔍 DEBUG: First 5 available slots for ${dayISO}:`, slots.slice(0, 5).map(slot => ({
        label: slot.label,
        startISO: slot.startISO,
        endISO: slot.endISO
      })));
    }
    
    return slots;

  } catch (error) {
    console.error('Error in getMergedFreeSlots:', error);
    return [];
  }
}

/**
 * Get Google Calendar busy times using FreeBusy API
 */
async function getGoogleCalendarBusyTimes(
  tokens: string,
  calendarId: string,
  timeMin: DateTime,
  timeMax: DateTime
): Promise<Interval[]> {
  try {
    const parsedTokens = JSON.parse(tokens);
    const accessToken = parsedTokens.access_token;

    if (!accessToken) {
      console.warn('No Google Calendar access token available');
      return [];
    }

    // Initialize Google Calendar API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({ version: 'v3', auth });

    // Query FreeBusy API
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISO(),
        timeMax: timeMax.toISO(),
        items: [{ id: calendarId }]
      }
    });

    const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
    
    // Debug: Log the busy times we're getting from Google Calendar
    console.log(`🔍 DEBUG: Google Calendar busy times for ${calendarId}:`, busyTimes.map(busy => ({
      start: busy.start,
      end: busy.end,
      startLocal: DateTime.fromISO(busy.start!).setZone('America/New_York').toFormat('ccc, LLL d h:mm a'),
      endLocal: DateTime.fromISO(busy.end!).setZone('America/New_York').toFormat('ccc, LLL d h:mm a')
    })));
    
    return busyTimes.map(busy => 
      Interval.fromDateTimes(
        DateTime.fromISO(busy.start!),
        DateTime.fromISO(busy.end!)
      )
    );

  } catch (error) {
    console.error('Error querying Google Calendar FreeBusy:', error);
    throw error;
  }
}

/**
 * Compute available time slots for a detailer with improved timezone handling
 */
export async function computeSlotsV2(options: SlotOptions): Promise<TimeSlot[]> {
  const {
    detailerId,
    days = 14,
    durationMinutes = 240,
    tz = 'America/New_York',
    from,
    to
  } = options;

  // Get detailer info
  const detailer = await prisma.detailer.findUnique({
    where: { id: detailerId },
    select: { 
      businessHours: true,
      googleCalendarConnected: true,
      googleCalendarTokens: true,
      googleCalendarId: true
    }
  });

  if (!detailer?.businessHours) {
    console.warn('No business hours found for detailer:', detailerId);
    return [];
  }

  // Determine date range
  let startDate: Date;
  let endDate: Date;

  if (from && to) {
    startDate = from;
    endDate = to;
  } else {
    startDate = new Date();
    endDate = new Date();
    endDate.setDate(startDate.getDate() + days);
  }

  // Get existing Reeva bookings
  const existingBookings = await prisma.booking.findMany({
    where: {
      detailerId,
      status: { in: ['confirmed', 'pending'] },
      scheduledDate: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      scheduledDate: true,
      scheduledTime: true,
      customerName: true
    }
  });

  // Convert Reeva bookings to ISO format
  const reevaBookings = existingBookings.map(booking => {
    try {
      const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
      const startTime = booking.scheduledTime || '10:00';
      
      // Create start time in detailer's timezone
      const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: tz });
      const end = start.plus({ minutes: durationMinutes });
      
      return {
        start: start.toUTC().toISO(),
        end: end.toUTC().toISO()
      };
    } catch (error) {
      console.error('Error converting booking to ISO:', error);
      return null;
    }
  }).filter(Boolean) as { start: string; end: string }[];

  console.log(`Found ${reevaBookings.length} existing Reeva bookings`);

  // Generate slots for each day
  const allSlots: TimeSlot[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip past dates
    if (currentDate < new Date()) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dayISO = currentDate.toISOString().split('T')[0];
    
    // Get calendar ID (use detailer's calendar ID or default to 'primary')
    const calendarId = detailer.googleCalendarId || 'primary';
    
    // Get merged free slots for this day
    const daySlots = await getMergedFreeSlots(
      dayISO,
      calendarId,
      reevaBookings,
      detailerId,
      durationMinutes,
      30, // 30-minute steps
      tz
    );

    allSlots.push(...daySlots);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Limit to reasonable number of slots
  return allSlots.slice(0, 20);
}

/**
 * Get next week window for concrete date ranges
 */
export function nextWeekWindow(tz: string = 'America/New_York') {
  const now = DateTime.now().setZone(tz);
  
  // Start from today
  const start = now.startOf('day').toJSDate();
  
  // End 14 days from today
  const end = now.plus({ days: 14 }).endOf('day').toJSDate();

  console.log('Current and next week window:', {
    start: start.toISOString(),
    end: end.toISOString(),
    tz
  });

  return { start, end };
}
