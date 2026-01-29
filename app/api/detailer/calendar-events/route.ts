import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { normalizeToE164 } from '@/lib/phone';

const prisma = new PrismaClient();

// Helper function to refresh Google Calendar access token
async function refreshGoogleCalendarToken(refreshToken: string) {
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
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google Calendar token:', error);
    throw error;
  }
}

// Helper function to fetch events from Google Calendar
async function fetchGoogleCalendarEvents(accessToken: string, timeMin?: string, timeMax?: string) {
  try {
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      const rawCookie = request.headers.get("cookie") || "";
      console.log("[api][detailer][calendar-events] auth", {
        hasDefaultSessionCookie: rawCookie.includes("next-auth.session-token"),
        hasDetailerSessionCookie: rawCookie.includes("next-auth.detailer.session-token"),
        sessionUserId: session?.user?.id,
        sessionEmail: session?.user?.email,
      });
    }
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    // Get detailer with Google Calendar tokens and business hours
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { 
        id: true, 
        businessName: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAppointments: true,
        syncAvailability: true,
        businessHours: true,
        timezone: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Get detailer's timezone (default to America/New_York if not set)
    const detailerTimezone = detailer.timezone || 'America/New_York';
    const now = new Date();
    const completedServiceStats = new Map<string, { count: number; lastAt: Date }>();

    const updateCompletedServiceStats = (phoneRaw: string | null | undefined, completedAt: Date) => {
      if (!phoneRaw) return;
      if (Number.isNaN(completedAt.getTime())) return;
      if (completedAt.getTime() >= now.getTime()) return;

      const normalizedPhone = normalizeToE164(phoneRaw) || phoneRaw;
      const existing = completedServiceStats.get(normalizedPhone);
      if (!existing) {
        completedServiceStats.set(normalizedPhone, { count: 1, lastAt: completedAt });
        return;
      }
      existing.count += 1;
      if (completedAt.getTime() > existing.lastAt.getTime()) {
        existing.lastAt = completedAt;
      }
    };

    const getStartDateTime = (date: Date, timeStr?: string | null) => {
      if (!timeStr) return date;
      let timePart = timeStr.trim();
      const rangeMatch = timePart.match(/(\d{1,2}:\d{2}\s*(AM|PM))/i);
      if (rangeMatch) {
        timePart = rangeMatch[1];
      } else if (timePart.includes('to')) {
        timePart = timePart.split(/\s+to\s+/i)[0]?.trim() || timePart;
      } else if (timePart.includes('-')) {
        timePart = timePart.split(/\s*-\s*/)[0]?.trim() || timePart;
      }

      let hour24: number | null = null;
      let minute = 0;
      const match = timePart.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (match) {
        const hours = parseInt(match[1], 10);
        minute = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3]?.toUpperCase();
        if (period) {
          hour24 = hours % 12;
          if (period === 'PM') {
            hour24 += 12;
          }
        } else {
          hour24 = hours;
        }
      }

      if (hour24 === null || Number.isNaN(hour24) || Number.isNaN(minute)) {
        return date;
      }

      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const startDT = DateTime.fromObject(
        { year, month, day, hour: hour24, minute },
        { zone: detailerTimezone }
      );
      const jsDate = startDT.toUTC().toJSDate();
      return Number.isNaN(jsDate.getTime()) ? date : jsDate;
    };

    let events = [];
    let localEvents = [];

      // First, fetch local events and bookings from our database
      try {
      const [events, bookings, employees, customerSnapshots] = await Promise.all([
        prisma.event.findMany({
          where: { detailerId },
          orderBy: { date: 'asc' }
        }),
          prisma.booking.findMany({
            where: { detailerId },
            include: {
              resource: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            },
            orderBy: { scheduledDate: 'asc' }
          }),
          prisma.employee.findMany({
            where: { detailerId },
            select: { id: true, name: true, color: true, imageUrl: true }
          }),
        prisma.customerSnapshot.findMany({
          where: { detailerId },
            select: { 
              customerPhone: true, 
              customerName: true, 
              customerEmail: true, 
              address: true,
              locationType: true,
              customerType: true,
              vehicleModel: true,
              services: true,
              updatedAt: true
            }
          })
        ]);

        for (const booking of bookings) {
          if (booking.status !== 'completed') continue;
          const startDateTime = getStartDateTime(booking.scheduledDate, booking.scheduledTime);
          updateCompletedServiceStats(booking.customerPhone, startDateTime);
        }

        for (const event of events) {
          if (event.bookingId) continue;
          if (!event.description || !event.description.includes('__METADATA__:')) continue;
          const parts = event.description.split('__METADATA__:');
          const metadataJson = parts[1] || '{}';
          try {
            const metadata = JSON.parse(metadataJson);
            const customerPhone = metadata.customerPhone;
            if (!customerPhone) continue;
            const startDateTime = getStartDateTime(event.date, event.time || undefined);
            updateCompletedServiceStats(customerPhone, startDateTime);
          } catch {
            continue;
          }
        }
        
        // Create employee map for quick lookup
        const employeeMap = new Map(employees.map((emp: any) => [emp.id, emp]));
        
        // Create customer snapshot map by phone number (normalized) for quick lookup
        const customerMap = new Map<string, any>();
        customerSnapshots.forEach((customer: any) => {
          if (customer.customerPhone) {
            const normalizedPhone = normalizeToE164(customer.customerPhone) || customer.customerPhone;
            customerMap.set(normalizedPhone, customer);
          }
        });

      // Helper function to get day of week name from date (using UTC to avoid timezone issues)
      const getDayOfWeek = (date: Date): string => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getUTCDay()]; // Use UTC day to avoid timezone shifts
      };

      // Transform local events to match calendar format
      const transformedEvents = events.map((event: any) => {
        // Handle date - MongoDB returns Date objects, extract UTC date immediately
        const eventDateRaw = event.date;
        let eventDate: Date;
        if (eventDateRaw instanceof Date) {
          eventDate = eventDateRaw;
        } else if (typeof eventDateRaw === 'string') {
          eventDate = new Date(eventDateRaw);
        } else {
          eventDate = new Date(eventDateRaw);
        }
        
        // Extract UTC date string immediately to avoid any timezone issues
        const utcYear = eventDate.getUTCFullYear();
        const utcMonth = eventDate.getUTCMonth();
        const utcDay = eventDate.getUTCDate();
        const dateStr = `${utcYear}-${String(utcMonth + 1).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}`;
        
        // Handle time parsing more safely
        let startDateTime, endDateTime;
        
        // For all-day events, use the full day (or business hours if time is set)
        if (event.allDay) {
          // dateStr is already extracted above using UTC
          if (event.time && detailer?.businessHours) {
            // All-day event with business hours - parse the start time and get end time from business hours
            let startTimeStr = event.time;
            
            // Convert 12-hour format to 24-hour format if needed
            if (startTimeStr.includes('PM') || startTimeStr.includes('AM')) {
              const isPM = startTimeStr.includes('PM');
              const timeOnly = startTimeStr.replace(/\s*(AM|PM)/i, '').trim();
              const [hours, minutes] = timeOnly.split(':').map(Number);
              
              let hour24 = hours;
              if (isPM && hours !== 12) {
                hour24 = hours + 12;
              } else if (!isPM && hours === 12) {
                hour24 = 0;
              }
              
              startTimeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
            } else if (startTimeStr.includes(':')) {
              // Already in HH:MM format, add seconds
              if (startTimeStr.split(':').length === 2) {
                startTimeStr = `${startTimeStr}:00`;
              }
            }
            
            startDateTime = new Date(`${dateStr}T${startTimeStr}`);
            
            // Get end time from business hours for this day
            // Use the UTC date string to get day of week correctly
            const [year, month, day] = dateStr.split('-').map(Number);
            const dateForDayOfWeek = new Date(Date.UTC(year, month - 1, day));
            const dayOfWeek = getDayOfWeek(dateForDayOfWeek);
            const businessHours = detailer.businessHours as any;
            let endTimeStr = null;
            
            if (businessHours && businessHours[dayOfWeek]) {
              const dayHours = businessHours[dayOfWeek];
              // Handle both array format [open, close] and object format {open, close}
              if (Array.isArray(dayHours) && dayHours.length >= 2) {
                endTimeStr = dayHours[1];
              } else if (typeof dayHours === 'object' && dayHours !== null) {
                endTimeStr = (dayHours as any).close || (dayHours as any)[1];
              }
              
              // Format end time
              if (endTimeStr) {
                if (endTimeStr.includes('PM') || endTimeStr.includes('AM')) {
                  const isPM = endTimeStr.includes('PM');
                  const timeOnly = endTimeStr.replace(/\s*(AM|PM)/i, '').trim();
                  const [hours, minutes] = timeOnly.split(':').map(Number);
                  
                  let hour24 = hours;
                  if (isPM && hours !== 12) {
                    hour24 = hours + 12;
                  } else if (!isPM && hours === 12) {
                    hour24 = 0;
                  }
                  
                  endTimeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
                } else if (endTimeStr.includes(':')) {
                  if (endTimeStr.split(':').length === 2) {
                    endTimeStr = `${endTimeStr}:00`;
                  }
                }
              }
            }
            
            // Use business hours end time if available, otherwise default to 2 hours later
            if (endTimeStr) {
              endDateTime = new Date(`${dateStr}T${endTimeStr}`);
            } else {
              endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
            }
          } else {
            // All-day event without specific time - use full day
            startDateTime = new Date(`${dateStr}T00:00:00`);
            endDateTime = new Date(`${dateStr}T23:59:59`);
          }
        } else if (event.time) {
          // Timed event - parse time
          let timeStr = event.time;
          
          // Check if time is in range format: "7:00 AM to 12:00 PM"
          const timeRangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          
          if (timeRangeMatch) {
            // Parse start time
            let startHour = parseInt(timeRangeMatch[1]);
            const startMin = parseInt(timeRangeMatch[2]);
            const startPeriod = timeRangeMatch[3].toUpperCase();
            if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
            if (startPeriod === 'AM' && startHour === 12) startHour = 0;
            const startTime24 = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
            
            // Parse end time
            let endHour = parseInt(timeRangeMatch[4]);
            const endMin = parseInt(timeRangeMatch[5]);
            const endPeriod = timeRangeMatch[6].toUpperCase();
            if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
            if (endPeriod === 'AM' && endHour === 12) endHour = 0;
            const endTime24 = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
            
            // Create dates in detailer's timezone, then convert to UTC
            const [year, month, day] = dateStr.split('-').map(Number);
            const [startHour24, startMin24] = startTime24.split(':').map(Number);
            const [endHour24, endMin24] = endTime24.split(':').map(Number);
            
            const startDT = DateTime.fromObject(
              { year, month, day, hour: startHour24, minute: startMin24 },
              { zone: detailerTimezone }
            );
            startDateTime = startDT.toUTC().toJSDate();
            
            const endDT = DateTime.fromObject(
              { year, month, day, hour: endHour24, minute: endMin24 },
              { zone: detailerTimezone }
            );
            endDateTime = endDT.toUTC().toJSDate();
            
            // If parsing fails, fall back to event date
            if (isNaN(startDateTime.getTime())) {
              startDateTime = eventDate;
            }
            if (isNaN(endDateTime.getTime())) {
              endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
            }
          } else {
            // Single time format - convert 12-hour format to 24-hour format
            if (timeStr.includes('PM') || timeStr.includes('AM')) {
              const isPM = timeStr.includes('PM');
              const timeOnly = timeStr.replace(/\s*(AM|PM)/i, '').trim();
              const [hours, minutes] = timeOnly.split(':').map(Number);
              
              let hour24 = hours;
              if (isPM && hours !== 12) {
                hour24 = hours + 12;
              } else if (!isPM && hours === 12) {
                hour24 = 0;
              }
              
              timeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
            } else if (!timeStr.includes(':')) {
              timeStr = `${timeStr}:00`;
            } else if (timeStr.split(':').length === 2) {
              timeStr = `${timeStr}:00`;
            }
            
            // Create date in detailer's timezone, then convert to UTC
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hour24, min24] = timeStr.split(':').map(Number);
            
            const startDT = DateTime.fromObject(
              { year, month, day, hour: hour24, minute: min24 },
              { zone: detailerTimezone }
            );
            startDateTime = startDT.toUTC().toJSDate();
            
            // If time parsing fails, fall back to event date
            if (isNaN(startDateTime.getTime())) {
              startDateTime = eventDate;
            }
            
            // Default to 2 hours duration for timed events
            endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
          }
        } else {
          // No time specified - use event date
          // dateStr is already extracted above using UTC
          startDateTime = new Date(`${dateStr}T00:00:00`);
          endDateTime = new Date(`${dateStr}T23:59:59`);
        }

        // dateStr is already extracted above using UTC methods

        // Parse metadata from description if present (do this early to get endDate for multi-day events)
        let cleanDescription = event.description || '';
        let customerName: string | null = null;
        let customerPhone: string | null = null;
        let customerAddress: string | null = null;
        let locationType: string | null = null;
        let customerType: string | null = null;
        let vehicleModel: string | null = null;
        let services: string[] | null = null;
        let metadataEndDate: string | null = null;
        
        if (event.description && event.description.includes('__METADATA__:')) {
          const parts = event.description.split('__METADATA__:');
          cleanDescription = parts[0].trim();
          try {
            const metadata = JSON.parse(parts[1] || '{}');
            customerName = metadata.customerName || null;
            customerPhone = metadata.customerPhone || null;
            customerAddress = metadata.customerAddress || null;
            locationType = metadata.locationType || null;
            customerType = metadata.customerType || null;
            vehicleModel = metadata.vehicleModel || null;
            services = metadata.services || null;
            metadataEndDate = metadata.endDate || null;
          } catch (e) {
            // Ignore parse errors, use original description
          }
        }
        
        // For multi-day events, recalculate endDateTime using the end date from metadata
        if (metadataEndDate && !event.allDay && event.time) {
          // Parse the end date from metadata
          const endDateFromMetadata = new Date(metadataEndDate);
          if (!isNaN(endDateFromMetadata.getTime())) {
            // Extract time from event.time (should be in range format like "7:00 AM to 6:00 PM")
            const timeRangeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeRangeMatch) {
              // Parse end time from the range
              let endHour = parseInt(timeRangeMatch[4]);
              const endMin = parseInt(timeRangeMatch[5]);
              const endPeriod = timeRangeMatch[6].toUpperCase();
              if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
              if (endPeriod === 'AM' && endHour === 12) endHour = 0;
              const endTime24 = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
              
              // Get end date string from metadata end date
              const endYear = endDateFromMetadata.getUTCFullYear();
              const endMonth = endDateFromMetadata.getUTCMonth() + 1;
              const endDay = endDateFromMetadata.getUTCDate();
              
              // Create end date in detailer's timezone, then convert to UTC
              const [endHour24, endMin24] = endTime24.split(':').map(Number);
              const endDT = DateTime.fromObject(
                { year: endYear, month: endMonth, day: endDay, hour: endHour24, minute: endMin24 },
                { zone: detailerTimezone }
              );
              endDateTime = endDT.toUTC().toJSDate();
            }
          }
        }
        
        // Enrich with CustomerSnapshot data if available (source of truth)
        if (customerPhone) {
          const normalizedEventPhone = normalizeToE164(customerPhone) || customerPhone;
          const customerSnapshot = customerMap.get(normalizedEventPhone);
          if (customerSnapshot) {
            // Use CustomerSnapshot as source of truth - it's always up-to-date
            customerName = customerSnapshot.customerName || customerName;
            customerAddress = customerSnapshot.address || customerAddress;
            locationType = customerSnapshot.locationType || locationType;
            customerType = customerSnapshot.customerType || customerType;
            vehicleModel = customerSnapshot.vehicleModel || vehicleModel;
            services = customerSnapshot.services || services;
            // Keep the phone from metadata (it should match, but metadata is the source for phone)
          }
        }

        // Get employee color if employee is assigned
        const employee = event.employeeId ? employeeMap.get(event.employeeId) : null;
        const eventColor = employee && employee.color ? employee.color : (event.color || 'blue');

        const normalizedPhoneForStats = customerPhone ? (normalizeToE164(customerPhone) || customerPhone) : null;
        const stats = normalizedPhoneForStats ? completedServiceStats.get(normalizedPhoneForStats) : null;
        
        return {
          id: event.id,
          title: event.title,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          date: dateStr, // Use UTC-extracted date string
          time: event.time,
          allDay: event.allDay,
          color: eventColor, // Use employee's color if assigned, otherwise use event color
          employeeId: event.employeeId || null,
          employeeName: employee ? employee.name : null,
          employeeImageUrl: employee ? employee.imageUrl : null,
          description: cleanDescription,
          location: event.location || '',
          source: 'local',
          bookingId: event.bookingId,
          resourceId: event.resourceId || null,
          customerName,
          customerPhone,
          customerAddress,
          locationType,
          customerType,
          vehicleType: vehicleModel, // Use vehicleType for consistency with bookings
          vehicleModel,
          services,
          completedServiceCount: stats?.count ?? 0,
          lastCompletedServiceAt: stats?.lastAt ? stats.lastAt.toISOString() : null
        };
      });

      // Transform bookings to match calendar format
      const transformedBookings = bookings.map((booking: any) => {
        const bookingDate = new Date(booking.scheduledDate);
        
        // Handle time parsing for bookings
        let startDateTime, endDateTime;
        
        if (booking.scheduledTime) {
          // Parse time more carefully - convert 12-hour to 24-hour format
          let timeStr = booking.scheduledTime;
          
          // Convert 12-hour format to 24-hour format
          if (timeStr.includes('PM') || timeStr.includes('AM')) {
            const isPM = timeStr.includes('PM');
            const timeOnly = timeStr.replace(/\s*(AM|PM)/i, '').trim();
            const timeParts = timeOnly.split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
            
            let hour24 = hours;
            if (isPM && hours !== 12) {
              hour24 = hours + 12;
            } else if (!isPM && hours === 12) {
              hour24 = 0;
            }
            
            timeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          } else if (!timeStr.includes(':')) {
            timeStr = `${timeStr}:00`;
          }
          
          // Use UTC date string to avoid timezone issues
          const dateStr = bookingDate.getUTCFullYear() + '-' + 
            String(bookingDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(bookingDate.getUTCDate()).padStart(2, '0');
          
          // Create date in detailer's timezone, then convert to UTC
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hour24, min24] = timeStr.split(':').map(Number);
          
          const startDT = DateTime.fromObject(
            { year, month, day, hour: hour24, minute: min24 },
            { zone: detailerTimezone }
          );
          startDateTime = startDT.toUTC().toJSDate();
          
          // If time parsing fails, fall back to booking date
          if (isNaN(startDateTime.getTime())) {
            startDateTime = bookingDate;
          }
        } else {
          startDateTime = bookingDate;
        }
        
        // Calculate end time (default 2 hours for bookings)
        endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
        const normalizedPhoneForStats = booking.customerPhone
          ? (normalizeToE164(booking.customerPhone) || booking.customerPhone)
          : null;
        const stats = normalizedPhoneForStats ? completedServiceStats.get(normalizedPhoneForStats) : null;

        return {
          id: booking.id,
          title: `${booking.customerName || 'Customer'} - ${Array.isArray(booking.services) ? booking.services.join(', ') : booking.services || 'Detailing'}`,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          date: bookingDate.getUTCFullYear() + '-' + 
            String(bookingDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(bookingDate.getUTCDate()).padStart(2, '0'),
          time: booking.scheduledTime,
          allDay: false, // Bookings are never all-day
          color: booking.status === 'confirmed' ? 'green' : booking.status === 'pending' ? 'yellow' : 'red',
          description: `Customer: ${booking.customerName || 'N/A'}\nPhone: ${booking.customerPhone}\nVehicle: ${booking.vehicleType || 'N/A'}\nLocation: ${booking.vehicleLocation || 'N/A'}\nServices: ${Array.isArray(booking.services) ? booking.services.join(', ') : booking.services || 'Detailing'}\nStatus: ${booking.status}\n${booking.notes ? `Notes: ${booking.notes}` : ''}`,
          location: booking.vehicleLocation || '',
          source: 'local-google-synced',
          bookingId: booking.id,
          status: booking.status,
          // Include resource information
          resourceId: booking.resourceId,
          resource: booking.resource ? {
            id: booking.resource.id,
            name: booking.resource.name,
            type: booking.resource.type
          } : null,
          // Include booking details for the calendar view
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          vehicleType: booking.vehicleType,
          services: booking.services,
          duration: booking.duration,
          completedServiceCount: stats?.count ?? 0,
          lastCompletedServiceAt: stats?.lastAt ? stats.lastAt.toISOString() : null
        };
      });

      localEvents = [...transformedEvents, ...transformedBookings];
    } catch (error) {
      console.error('Error fetching local events:', error);
      localEvents = [];
    }

    // If Google Calendar is connected and tokens exist, fetch events
    if (detailer.googleCalendarConnected && detailer.googleCalendarTokens && detailer.googleCalendarRefreshToken) {
      try {
        const tokens = JSON.parse(detailer.googleCalendarTokens);
        let accessToken = tokens.access_token;

        // Calculate time range for the requested month
        let timeMin, timeMax;
        if (month) {
          const [year, monthNum] = month.split('-');
          const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
          timeMin = startDate.toISOString();
          timeMax = endDate.toISOString();
        }

        // Try to fetch events with current access token
        try {
          events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
        } catch (error) {
          // If access token is expired, try to refresh it
          console.log('Access token expired, refreshing...');
          accessToken = await refreshGoogleCalendarToken(detailer.googleCalendarRefreshToken);
          
          // Update the stored tokens
          const updatedTokens = {
            ...tokens,
            access_token: accessToken,
          };
          
          await prisma.detailer.update({
            where: { id: detailerId },
            data: {
              googleCalendarTokens: JSON.stringify(updatedTokens),
            },
          });

          // Retry fetching events with new access token
          events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
        }

        // Transform Google Calendar events to match our calendar format
        // Show all events from Google Calendar (no filtering for now)
        events = events
          .map((event: any) => ({
            id: event.id,
            title: event.summary || 'No Title',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime, // If no time, it's an all-day event
            color: 'blue', // Default color for Google Calendar events
            source: 'google',
            description: event.description || '',
            location: event.location || '',
          }));

        console.log('Sample Google Calendar events after transformation:');
        events.slice(0, 3).forEach((event, index) => {
          console.log(`Event ${index + 1}:`, {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            source: event.source,
            allDay: event.allDay
          });
        });

      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        // Return empty events array if Google Calendar fetch fails
        events = [];
      }
    }

    // Deduplicate events - prioritize local events over Google Calendar events
    // This prevents showing the same event twice when it exists in both calendars
    const eventMap = new Map();
    
    // First, add all local events
    localEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    // Then, add Google Calendar events only if they don't have a corresponding local event
    let skippedByGoogleId = 0;
    let skippedByTitleTime = 0;
    
    events.forEach(event => {
      // First, check if any local event has this Google Calendar event ID
      const hasLocalEventWithGoogleId = localEvents.some(localEvent => {
        return localEvent.googleEventId === event.id;
      });
      
      if (hasLocalEventWithGoogleId) {
        skippedByGoogleId++;
        console.log(`🔄 Skipping Google Calendar event (has local counterpart): "${event.title}" at ${event.start}`);
        return;
      }
      
      // Fallback: Check by title and time for events without proper googleEventId linkage
      const isDuplicate = localEvents.some(localEvent => {
        const sameTitle = localEvent.title === event.title;
        
        // More flexible time comparison - normalize both times to compare just the date part
        const localTime = new Date(localEvent.start);
        const googleTime = new Date(event.start);
        const sameDate = localTime.toDateString() === googleTime.toDateString();
        const sameHour = localTime.getHours() === googleTime.getHours();
        const sameMinute = localTime.getMinutes() === googleTime.getMinutes();
        
        return sameTitle && sameDate && sameHour && sameMinute;
      });
      
      if (!isDuplicate) {
        eventMap.set(event.id, event);
      } else {
        skippedByTitleTime++;
        console.log(`🔄 Skipping duplicate Google Calendar event: "${event.title}" at ${event.start}`);
      }
    });
    
    const allEvents = Array.from(eventMap.values());

    const duplicateCount = localEvents.length + events.length - allEvents.length;
    
    console.log('Calendar Events API Response:');
    console.log('- Local events:', localEvents.length);
    console.log('- Google events:', events.length);
    console.log('- Skipped by Google ID:', skippedByGoogleId);
    console.log('- Skipped by title/time:', skippedByTitleTime);
    console.log('- Total duplicates removed:', duplicateCount);
    console.log('- Total unique events:', allEvents.length);
    console.log('- Google Calendar connected:', detailer.googleCalendarConnected);
    console.log('- Sync appointments:', detailer.syncAppointments);

    return NextResponse.json({ 
      events: allEvents,
      localEvents,
      googleEvents: events,
      googleCalendarConnected: detailer.googleCalendarConnected || false,
      syncAppointments: detailer.syncAppointments || false,
      syncAvailability: detailer.syncAvailability || false
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
