/**
 * Improved time normalization utilities using Luxon for robust timezone handling
 * Fixes: timezone math, proper UTC conversion, and consistent date handling
 */

import { DateTime } from 'luxon';

export interface TimeSlot {
  startUtcISO: string;
  endUtcISO: string;
  startLocal: string;
  endLocal: string;
}

/**
 * Normalize a local time input to ISO UTC format using Luxon
 * Handles various input formats: "10", "10:00", "10 AM", "10:00 AM"
 */
export function normalizeLocalSlotV2(
  localDate: string,              // "2025-10-10"
  localTimeInput: string,         // "10" | "10:00" | "10 AM" | "10:00 am"
  tz: string = "America/New_York", // "America/New_York"
  durationMinutes: number = 120   // Default 2 hours
): TimeSlot {
  // Clean and normalize the input
  const raw = localTimeInput.trim().toUpperCase();
  
  // Apply heuristics to normalize format
  let candidate = raw
    .replace(/\s+/g, " ")                                    // Normalize spaces
    .replace(/^(\d{1,2})$/, "$1:00")                        // "10" -> "10:00"
    .replace(/^(\d{1,2}:\d{2})$/, "$1 AM")                  // "10:00" -> "10:00 AM"
    .replace(/^(\d{1,2})(AM|PM)$/, "$1:00 $2")              // "10AM" -> "10:00 AM"
    .replace(/^(\d{1,2}:\d{2})(AM|PM)$/, "$1 $2");          // "10:00AM" -> "10:00 AM"

  let startDateTime: DateTime;
  
  try {
    // Try to parse with AM/PM format first
    const timeWithAMPM = `${localDate} ${candidate}`;
    startDateTime = DateTime.fromFormat(timeWithAMPM, 'yyyy-MM-dd h:mm a', { zone: tz });
    
    if (!startDateTime.isValid) {
      // Fallback to 24-hour format
      const [hours, minutes] = candidate.split(':');
      const hour24 = parseInt(hours);
      const mins = parseInt(minutes || '0');
      
      // Create date with explicit timezone
      startDateTime = DateTime.fromISO(`${localDate}T${hour24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`, { zone: tz });
    }
  } catch (error) {
    throw new Error(`Invalid time format: "${localTimeInput}"`);
  }

  if (!startDateTime.isValid) {
    throw new Error(`Invalid time format: "${localTimeInput}"`);
  }

  // Calculate end time
  const endDateTime = startDateTime.plus({ minutes: durationMinutes });

  return {
    startUtcISO: startDateTime.toUTC().toISO(),
    endUtcISO: endDateTime.toUTC().toISO(),
    startLocal: startDateTime.toFormat('h:mm a'),
    endLocal: endDateTime.toFormat('h:mm a')
  };
}

/**
 * Check if two time slots overlap
 */
export function timeSlotsOverlapV2(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = DateTime.fromISO(slot1.startUtcISO);
  const end1 = DateTime.fromISO(slot1.endUtcISO);
  const start2 = DateTime.fromISO(slot2.startUtcISO);
  const end2 = DateTime.fromISO(slot2.endUtcISO);

  // Overlap if: start1 < end2 && start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Format ISO time for display in local timezone using Luxon
 */
export function formatTimeForDisplayV2(isoString: string, tz: string = "America/New_York"): string {
  try {
    const date = DateTime.fromISO(isoString).setZone(tz);
    return date.toFormat('ccc, LLL d, h:mm a');
  } catch (error) {
    console.error('Error formatting time for display:', error);
    return isoString;
  }
}

/**
 * Parse a date string with various formats and return DateTime in specified timezone
 */
export function parseDateV2(dateInput: string, tz: string = "America/New_York"): DateTime {
  const input = dateInput.trim().toLowerCase();
  
  // Handle relative dates
  if (input === 'today') {
    return DateTime.now().setZone(tz).startOf('day');
  }
  
  if (input === 'tomorrow') {
    return DateTime.now().setZone(tz).plus({ days: 1 }).startOf('day');
  }
  
  // Handle day names
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(input);
  if (dayIndex !== -1) {
    const today = DateTime.now().setZone(tz);
    const currentDay = today.weekday === 7 ? 0 : today.weekday; // Convert Sunday from 7 to 0
    const daysUntil = (dayIndex - currentDay + 7) % 7;
    const targetDay = daysUntil === 0 ? 0 : daysUntil; // If today, use today (0 days until)
    return today.plus({ days: targetDay }).startOf('day');
  }
  
  // Try to parse as ISO date or various formats
  let parsed: DateTime;
  
  // Try ISO format first
  parsed = DateTime.fromISO(dateInput, { zone: tz });
  if (parsed.isValid) {
    return parsed.startOf('day');
  }
  
  // Try common formats
  const formats = [
    'MM/dd/yyyy',
    'MM-dd-yyyy', 
    'yyyy-MM-dd',
    'M/d/yyyy',
    'M-d-yyyy',
    'MMM d, yyyy',
    'MMMM d, yyyy'
  ];
  
  for (const format of formats) {
    parsed = DateTime.fromFormat(dateInput, format, { zone: tz });
    if (parsed.isValid) {
      return parsed.startOf('day');
    }
  }
  
  throw new Error(`Unable to parse date: "${dateInput}"`);
}

/**
 * Suggest next available time slots after a conflict
 */
export function suggestNextSlotsV2(
  conflictEndISO: string,
  durationMinutes: number = 120,
  count: number = 3,
  tz: string = "America/New_York"
): Array<{ startLocal: string; startISO: string; label: string }> {
  const conflictEnd = DateTime.fromISO(conflictEndISO).setZone(tz);
  const suggestions: Array<{ startLocal: string; startISO: string; label: string }> = [];

  for (let i = 1; i <= count; i++) {
    // Suggest slots starting 30 minutes after conflict ends
    const startTime = conflictEnd.plus({ minutes: i * 30 });
    const endTime = startTime.plus({ minutes: durationMinutes });

    suggestions.push({
      startLocal: startTime.toFormat('h:mm a'),
      startISO: startTime.toUTC().toISO(),
      label: `${startTime.toFormat('ccc, LLL d')} ${startTime.toFormat('h:mm a')} – ${endTime.toFormat('h:mm a')} ${tz}`
    });
  }

  return suggestions;
}

/**
 * Create a business day window in the specified timezone
 */
export function createBusinessDayWindow(
  date: string,
  startTime: string,
  endTime: string,
  tz: string = "America/New_York"
): { open: DateTime; close: DateTime } {
  const open = DateTime.fromISO(`${date}T${startTime}`, { zone: tz });
  const close = DateTime.fromISO(`${date}T${endTime}`, { zone: tz });
  
  return { open, close };
}

/**
 * Check if a time is within business hours
 */
export function isWithinBusinessHours(
  timeISO: string,
  businessHours: any,
  tz: string = "America/New_York"
): boolean {
  try {
    const time = DateTime.fromISO(timeISO).setZone(tz);
    const dayName = time.toFormat('cccc').toLowerCase();
    const dayHours = businessHours[dayName];
    
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length !== 2) {
      return false;
    }
    
    const [startTime, endTime] = dayHours;
    if (!startTime || !endTime || startTime === '' || endTime === '') {
      return false;
    }
    
    const dayStart = time.startOf('day');
    const businessStart = dayStart.set({ 
      hour: parseInt(startTime.split(':')[0]), 
      minute: parseInt(startTime.split(':')[1]) 
    });
    const businessEnd = dayStart.set({ 
      hour: parseInt(endTime.split(':')[0]), 
      minute: parseInt(endTime.split(':')[1]) 
    });
    
    return time >= businessStart && time <= businessEnd;
    
  } catch (error) {
    console.error('Error checking business hours:', error);
    return false;
  }
}
