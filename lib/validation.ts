/**
 * Direct validation functions (no HTTP calls)
 */

import { PrismaClient } from '@prisma/client';
import { normalizeLocalSlot, timeSlotsOverlap } from './timeUtils';

const prisma = new PrismaClient();

export interface ValidationResult {
  available: boolean;
  conflicts?: Array<{
    title: string;
    time: string;
    type: string;
  }>;
  suggestions?: Array<{
    startLocal: string;
    startISO: string;
  }>;
}

export interface TimeRequest {
  detailerId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  tz?: string;
}

/**
 * Validate a time slot directly (no HTTP calls)
 */
export async function validateTime(request: TimeRequest): Promise<ValidationResult> {
  const {
    detailerId,
    date,
    time,
    durationMinutes = 120,
    tz = 'America/New_York'
  } = request;

  try {
    // Normalize the requested time to ISO format
    const { startUtcISO, endUtcISO } = normalizeLocalSlot(date, time, tz, durationMinutes);

    // Get existing bookings and events
    const existingBookings = await prisma.booking.findMany({
      where: {
        detailerId,
        status: { in: ['confirmed', 'pending'] }
      },
      select: {
        id: true,
        scheduledDate: true,
        scheduledTime: true,
        customerName: true
      }
    });

    const existingEvents = await prisma.event.findMany({
      where: {
        detailerId
      },
      select: {
        id: true,
        date: true,
        time: true,
        title: true
      }
    });

    // Check for conflicts
    const conflicts: Array<{ title: string; time: string; type: string }> = [];

    for (const booking of existingBookings) {
      try {
        const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
        const normalized = normalizeLocalSlot(bookingDate, booking.scheduledTime || '', tz, durationMinutes);
        
        if (timeSlotsOverlap({ startUtcISO, endUtcISO }, normalized)) {
          conflicts.push({
            title: booking.customerName || 'Existing appointment',
            time: booking.scheduledTime || 'TBD',
            type: 'booking'
          });
        }
      } catch (e) {
        // Skip invalid booking times
      }
    }

    for (const event of existingEvents) {
      try {
        const eventDate = event.date.toISOString().split('T')[0];
        const normalized = normalizeLocalSlot(eventDate, event.time || '', tz, durationMinutes);
        
        if (timeSlotsOverlap({ startUtcISO, endUtcISO }, normalized)) {
          conflicts.push({
            title: event.title || 'Existing appointment',
            time: event.time || 'TBD',
            type: 'event'
          });
        }
      } catch (e) {
        // Skip invalid event times
      }
    }

    if (conflicts.length > 0) {
      // Generate suggestions for alternative times
      const suggestions = [];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Generate 3 alternative times
      for (let i = 0; i < 3; i++) {
        const altDate = new Date(nextWeek);
        altDate.setDate(nextWeek.getDate() + i);
        altDate.setHours(9 + (i * 2), 0, 0, 0); // 9 AM, 11 AM, 1 PM
        
        const altDateStr = altDate.toISOString().split('T')[0];
        const altTimeStr = altDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        suggestions.push({
          startLocal: altTimeStr,
          startISO: altDate.toISOString()
        });
      }

      return {
        available: false,
        conflicts,
        suggestions
      };
    }

    return {
      available: true
    };

  } catch (error) {
    console.error('Error validating time:', error);
    return {
      available: false,
      conflicts: [{
        title: 'Validation error',
        time: 'Unknown',
        type: 'error'
      }]
    };
  }
}
