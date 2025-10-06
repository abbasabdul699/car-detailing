/**
 * Time normalization utilities for consistent handling of time inputs
 * across AI, web forms, and webhooks
 */

export interface TimeSlot {
  startUtcISO: string;
  endUtcISO: string;
}

/**
 * Normalize a local time input to ISO UTC format
 * Handles various input formats: "10", "10:00", "10 AM", "10:00 AM"
 */
export function normalizeLocalSlot(
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

  // Try to parse with AM/PM first, then fallback to 24-hour
  let startDateTime: Date;
  
  try {
    // Parse with AM/PM format
    const timeWithAMPM = `${localDate} ${candidate}`;
    const parsed = new Date(`${timeWithAMPM} ${tz}`);
    
    if (isNaN(parsed.getTime())) {
      // Fallback to 24-hour format
      const [hours, minutes] = candidate.split(':');
      const hour24 = parseInt(hours);
      const mins = parseInt(minutes || '0');
      
      // Create date with local timezone
      startDateTime = new Date(`${localDate}T${hour24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`);
    } else {
      startDateTime = parsed;
    }
  } catch (error) {
    throw new Error(`Invalid time format: "${localTimeInput}"`);
  }

  if (isNaN(startDateTime.getTime())) {
    throw new Error(`Invalid time format: "${localTimeInput}"`);
  }

  // Calculate end time
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  return {
    startUtcISO: startDateTime.toISOString(),
    endUtcISO: endDateTime.toISOString()
  };
}

/**
 * Check if two time slots overlap
 */
export function timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = new Date(slot1.startUtcISO);
  const end1 = new Date(slot1.endUtcISO);
  const start2 = new Date(slot2.startUtcISO);
  const end2 = new Date(slot2.endUtcISO);

  // Overlap if: start1 < end2 && start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Format ISO time for display in local timezone
 */
export function formatTimeForDisplay(isoString: string, tz: string = "America/New_York"): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return isoString;
  }
}

/**
 * Suggest next available time slots after a conflict
 */
export function suggestNextSlots(
  conflictEndISO: string,
  durationMinutes: number = 120,
  count: number = 3
): Array<{ startLocal: string; startISO: string }> {
  const conflictEnd = new Date(conflictEndISO);
  const suggestions: Array<{ startLocal: string; startISO: string }> = [];

  for (let i = 1; i <= count; i++) {
    // Suggest slots starting 30 minutes after conflict ends
    const startTime = new Date(conflictEnd.getTime() + (i * 30 * 60 * 1000));
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    suggestions.push({
      startLocal: startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      startISO: startTime.toISOString()
    });
  }

  return suggestions;
}
