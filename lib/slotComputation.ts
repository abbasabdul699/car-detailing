/**
 * Slot computation for availability checking
 */

import { PrismaClient } from '@prisma/client';
import { normalizeLocalSlot, timeSlotsOverlap } from './timeUtils';

const prisma = new PrismaClient();

export interface TimeSlot {
  startISO: string;
  endISO: string;
  startLocal: string;
  endLocal: string;
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
 * Compute available time slots for a detailer
 */
export async function computeSlots(options: SlotOptions): Promise<TimeSlot[]> {
  const {
    detailerId,
    days = 14,
    durationMinutes = 120,
    tz = 'America/New_York',
    from,
    to
  } = options;

  // Get detailer's business hours
  const detailer = await prisma.detailer.findUnique({
    where: { id: detailerId },
    select: { businessHours: true }
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

  // Get existing bookings and events
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

  const existingEvents = await prisma.event.findMany({
    where: {
      detailerId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      date: true,
      time: true,
      title: true
    }
  });

  // Convert existing items to ISO format for overlap checking
  const busySlots: { startISO: string; endISO: string }[] = [];

  for (const booking of existingBookings) {
    try {
      const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
      const normalized = normalizeLocalSlot(bookingDate, booking.scheduledTime || '', tz, durationMinutes);
      busySlots.push({
        startISO: normalized.startUtcISO,
        endISO: normalized.endUtcISO
      });
    } catch (e) {
      // Skip invalid booking times
    }
  }

  for (const event of existingEvents) {
    try {
      const eventDate = event.date.toISOString().split('T')[0];
      const normalized = normalizeLocalSlot(eventDate, event.time || '', tz, durationMinutes);
      busySlots.push({
        startISO: normalized.startUtcISO,
        endISO: normalized.endUtcISO
      });
    } catch (e) {
      // Skip invalid event times
    }
  }

  // Generate available slots
  const availableSlots: TimeSlot[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip past dates
    if (currentDate < new Date()) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Get business hours for this day of the week
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[currentDate.getDay()];
    const dayHours = detailer.businessHours[dayOfWeek];
    
    // Skip if business is closed on this day
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length !== 2) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const [startTime, endTime] = dayHours;
    
    // Skip if times are empty strings (business is closed)
    if (!startTime || !endTime || startTime === '' || endTime === '') {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Parse business hours (format: "09:00", "17:00")
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const workStart = new Date(currentDate);
    workStart.setHours(startHour, startMin, 0, 0);

    const workEnd = new Date(currentDate);
    workEnd.setHours(endHour, endMin, 0, 0);

    let currentTime = new Date(workStart);

    while (currentTime.getTime() + durationMinutes * 60 * 1000 <= workEnd.getTime()) {
      // Generate slot
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);
      
      const slotISO = {
        startISO: currentTime.toISOString(),
        endISO: slotEnd.toISOString()
      };

      // Check for conflicts
      const hasConflict = busySlots.some(busy => 
        timeSlotsOverlap(slotISO, busy)
      );

      if (!hasConflict) {
        availableSlots.push({
          startISO: slotISO.startISO,
          endISO: slotISO.endISO,
          startLocal: currentTime.toLocaleString('en-US', {
            timeZone: tz,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          endLocal: slotEnd.toLocaleString('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        });
      }

      // Move to next slot (30-minute increments)
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableSlots.slice(0, 20); // Limit to 20 slots
}

/**
 * Get next week window for concrete date ranges
 */
export function nextWeekWindow(tz: string = 'America/New_York') {
  const now = new Date();
  const start = new Date(now);
  
  // Find next Monday
  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
  start.setDate(now.getDate() + daysUntilMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
