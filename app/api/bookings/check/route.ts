import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { normalizeLocalSlot, timeSlotsOverlap, suggestNextSlots } from '@/lib/timeUtils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      detailerId, 
      date, 
      time, 
      durationMinutes = 120, 
      tz = "America/New_York"
    } = body;

    console.log('=== BOOKING CONFLICT CHECK ===');
    console.log('Input:', { detailerId, date, time, durationMinutes, tz });

    // Normalize the time input to ISO format
    const { startUtcISO, endUtcISO } = normalizeLocalSlot(date, time, tz, durationMinutes);
    
    console.log('Normalized time:', { startUtcISO, endUtcISO });

    // Check for conflicts with existing bookings
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

    // Convert existing bookings to ISO format for comparison
    const existingBookingSlots = existingBookings.map(booking => {
      try {
        let existingTime = booking.scheduledTime || '';
        const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
        const normalized = normalizeLocalSlot(bookingDate, existingTime, tz, durationMinutes);
        
        return {
          ...booking,
          startUtcISO: normalized.startUtcISO,
          endUtcISO: normalized.endUtcISO
        };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

    // Convert existing events to ISO format for comparison
    const existingEventSlots = existingEvents.map(event => {
      try {
        let existingTime = event.time || '';
        const eventDate = event.date.toISOString().split('T')[0];
        const normalized = normalizeLocalSlot(eventDate, existingTime, tz, durationMinutes);
        
        return {
          ...event,
          startUtcISO: normalized.startUtcISO,
          endUtcISO: normalized.endUtcISO
        };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

    // Check for conflicts
    const bookingConflicts = existingBookingSlots.filter(existing => 
      timeSlotsOverlap({ startUtcISO, endUtcISO }, existing)
    );

    const eventConflicts = existingEventSlots.filter(existing => 
      timeSlotsOverlap({ startUtcISO, endUtcISO }, existing)
    );

    const hasConflict = bookingConflicts.length > 0 || eventConflicts.length > 0;

    console.log('Conflict check results:', {
      hasConflict,
      bookingConflicts: bookingConflicts.length,
      eventConflicts: eventConflicts.length
    });

    if (hasConflict) {
      const allConflicts = [...bookingConflicts, ...eventConflicts];
      const suggestions = suggestNextSlots(endUtcISO, durationMinutes, 3);

      return NextResponse.json({
        available: false,
        conflicts: allConflicts.map(conflict => ({
          title: conflict.title || conflict.customerName || 'Existing appointment',
          time: conflict.scheduledTime || conflict.time || 'TBD',
          type: 'scheduledTime' in conflict ? 'booking' : 'event'
        })),
        suggestions,
        requestedSlot: {
          startUtcISO,
          endUtcISO,
          localTime: time
        }
      });
    }

    return NextResponse.json({
      available: true,
      requestedSlot: {
        startUtcISO,
        endUtcISO,
        localTime: time
      }
    });

  } catch (error) {
    console.error('Error checking booking conflicts:', error);
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
