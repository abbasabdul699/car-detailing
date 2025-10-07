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
  
  console.log('Slot computation debug:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    currentDate: currentDate.toISOString(),
    busySlotsCount: busySlots.length
  });
  
  // Debug: Log all busy slots
  if (busySlots.length > 0) {
    console.log('Busy slots:');
    busySlots.forEach((slot, index) => {
      console.log(`  ${index + 1}. ${slot.startISO} - ${slot.endISO}`);
    });
  }

  while (currentDate <= endDate) {
    // Skip past dates
    if (currentDate < new Date()) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Check if this date is actually in the range (handle timezone issues)
    const dateStr = currentDate.toISOString().split('T')[0];
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    if (dateStr < startStr || dateStr > endStr) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Get business hours for this day of the week
    // CRITICAL: Use the date string to determine the correct day of the week
    // This avoids timezone issues when the date is at midnight
    const dateStrForDay = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateObj = new Date(dateStrForDay + 'T12:00:00'); // Use noon to avoid timezone edge cases
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dateObj.getDay()];
    const dayHours = detailer.businessHours[dayOfWeek];
    
    console.log(`Processing ${dayOfWeek} ${currentDate.toISOString().split('T')[0]}:`, dayHours);
    
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
    
    // Parse business hours (format: "08:00", "18:00")
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    // Create dates in the specified timezone (reuse dateStr from above)
    
      // Create work start time in the target timezone
      const workStart = new Date(`${dateStr}T${startTime}:00`);
      const workEnd = new Date(`${dateStr}T${endTime}:00`);
      
      console.log(`Work times for ${dayOfWeek}:`, {
        workStart: workStart.toISOString(),
        workEnd: workEnd.toISOString()
      });

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
      
      // Debug: Log slots that are being skipped
      if (hasConflict) {
        console.log(`Skipping slot due to conflict: ${currentTime.toLocaleString('en-US', {
          timeZone: tz,
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`);
      }

      if (!hasConflict) {
        // Create proper local time representation for display
        const displayDate = new Date(dateStrForDay + 'T12:00:00'); // Use noon to avoid timezone edge cases
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[displayDate.getDay()];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[displayDate.getMonth()];
        
        availableSlots.push({
          startISO: slotISO.startISO,
          endISO: slotISO.endISO,
          startLocal: `${dayName}, ${monthName} ${displayDate.getDate()}: ${currentTime.toLocaleString('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`,
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
 * Get current and next week window for concrete date ranges
 */
export function nextWeekWindow(tz: string = 'America/New_York') {
  const now = new Date();
  
  // Start from today (current week)
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  // End 14 days from today (covers current week + next week)
  const end = new Date(now);
  end.setDate(now.getDate() + 14);
  end.setHours(23, 59, 59, 999);

  console.log('Current and next week window:', {
    start: start.toISOString(),
    startLocal: start.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz }),
    startDate: start.toLocaleDateString('en-US', { timeZone: tz }),
    end: end.toISOString(),
    endLocal: end.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz }),
    endDate: end.toLocaleDateString('en-US', { timeZone: tz })
  });

  return { start, end };
}
