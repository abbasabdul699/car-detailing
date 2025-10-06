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
      tz = "America/New_York", 
      title,
      customerName,
      customerPhone,
      vehicleType,
      vehicleLocation,
      services,
      source = "AI"
    } = body;

    console.log('=== BOOKING CREATION REQUEST ===');
    console.log('Input:', { detailerId, date, time, durationMinutes, tz, title });

    // Normalize the time input to ISO format
    const { startUtcISO, endUtcISO } = normalizeLocalSlot(date, time, tz, durationMinutes);
    
    console.log('Normalized time:', { startUtcISO, endUtcISO });

    // 🔒 Authoritative overlap check - check both bookings and events
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
        // Parse existing booking time
        let existingTime = booking.scheduledTime || '';
        const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
        
        // Normalize existing booking time
        const normalized = normalizeLocalSlot(bookingDate, existingTime, tz, durationMinutes);
        
        return {
          ...booking,
          startUtcISO: normalized.startUtcISO,
          endUtcISO: normalized.endUtcISO
        };
      } catch (error) {
        console.warn('Failed to normalize existing booking time:', booking.scheduledTime);
        return null;
      }
    }).filter(Boolean);

    // Convert existing events to ISO format for comparison
    const existingEventSlots = existingEvents.map(event => {
      try {
        // Parse existing event time
        let existingTime = event.time || '';
        const eventDate = event.date.toISOString().split('T')[0];
        
        // Normalize existing event time
        const normalized = normalizeLocalSlot(eventDate, existingTime, tz, durationMinutes);
        
        return {
          ...event,
          startUtcISO: normalized.startUtcISO,
          endUtcISO: normalized.endUtcISO
        };
      } catch (error) {
        console.warn('Failed to normalize existing event time:', event.time);
        return null;
      }
    }).filter(Boolean);

    // Check for conflicts with existing bookings
    const bookingConflicts = existingBookingSlots.filter(existing => 
      timeSlotsOverlap({ startUtcISO, endUtcISO }, existing)
    );

    // Check for conflicts with existing events
    const eventConflicts = existingEventSlots.filter(existing => 
      timeSlotsOverlap({ startUtcISO, endUtcISO }, existing)
    );

    console.log('Conflict check results:', {
      bookingConflicts: bookingConflicts.length,
      eventConflicts: eventConflicts.length,
      totalConflicts: bookingConflicts.length + eventConflicts.length
    });

    if (bookingConflicts.length > 0 || eventConflicts.length > 0) {
      const allConflicts = [...bookingConflicts, ...eventConflicts];
      const conflictDetails = allConflicts.map(conflict => ({
        title: conflict.title || 'Existing appointment',
        time: conflict.scheduledTime || conflict.time || 'TBD'
      }));

      const suggestions = suggestNextSlots(endUtcISO, durationMinutes, 3);

      console.log('CONFLICT DETECTED:', conflictDetails);

      return NextResponse.json({
        ok: false,
        reason: "CONFLICT",
        message: `Time clash with existing appointment. Conflicts: ${conflictDetails.map(c => c.title).join(', ')}`,
        conflicts: conflictDetails,
        suggestions,
        requestedSlot: {
          startUtcISO,
          endUtcISO,
          localTime: time
        }
      }, { status: 409 });
    }

    // No conflicts - create the booking
    console.log('No conflicts found, creating booking...');

    const booking = await prisma.booking.create({
      data: {
        detailerId,
        customerName: customerName || 'Customer',
        customerPhone: customerPhone || '',
        vehicleType: vehicleType || '',
        vehicleLocation: vehicleLocation || '',
        services: services || [],
        scheduledDate: new Date(startUtcISO),
        scheduledTime: time,
        status: 'confirmed',
        title: title || `${customerName || 'Customer'} - ${(services || []).join(', ')}`
      }
    });

    console.log('Booking created successfully:', booking.id);

    // Create corresponding calendar event
    const event = await prisma.event.create({
      data: {
        detailerId,
        title: booking.title,
        description: `Customer: ${booking.customerName}\nPhone: ${booking.customerPhone}\nVehicle: ${booking.vehicleType}\nLocation: ${booking.vehicleLocation}\nServices: ${booking.services.join(', ')}`,
        date: new Date(startUtcISO),
        time: time,
        bookingId: booking.id,
        allDay: false,
        color: '#3B82F6'
      }
    });

    console.log('Calendar event created successfully:', event.id);

    // Sync to Google Calendar if connected
    try {
      const detailer = await prisma.detailer.findUnique({
        where: { id: detailerId },
        select: {
          googleCalendarConnected: true,
          googleCalendarTokens: true,
          googleCalendarRefreshToken: true
        }
      });

      if (detailer?.googleCalendarConnected && detailer.googleCalendarTokens) {
        const { syncToGoogleCalendar } = await import('@/lib/calendarSync');
        await syncToGoogleCalendar(event.id);
        console.log('Synced to Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      // Don't fail the booking creation if Google Calendar sync fails
    }

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      eventId: event.id,
      startUtcISO,
      endUtcISO,
      message: 'Booking created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
