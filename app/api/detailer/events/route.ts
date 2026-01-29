import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { normalizeToE164 } from '@/lib/phone';
import { upsertCustomerSnapshot } from '@/lib/customerSnapshot';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { title, color, employeeId, startDate, endDate, isAllDay, description, resourceId, time, startTime: startTimeParam, endTime: endTimeParam, customerName, customerPhone, customerEmail, customerAddress, locationType, customerType, vehicleModel, services, eventType } = body;

    const normalizedEventType = eventType === 'block' ? 'block' : 'appointment';
    const titleToUse = title?.trim() ? title : (normalizedEventType === 'block' ? 'Blocked Time' : '');

    if (!titleToUse || !startDate) {
      return NextResponse.json({ error: 'Title and start date are required' }, { status: 400 });
    }

    // Require resourceId for all events
    if (!resourceId) {
      return NextResponse.json({ error: 'Resource (Bay or Van) is required for all events' }, { status: 400 });
    }

    // Verify the detailer exists and get timezone
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { id: true, businessName: true, timezone: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Get detailer's timezone (default to America/New_York if not set)
    const detailerTimezone = detailer.timezone || 'America/New_York';

    // Parse the start and end dates
    // For timed events with separate time fields, construct Date objects in detailer's timezone
    let startDateTime: Date;
    let endDateTime: Date;
    let startTime: string | null = null;
    
    if (!isAllDay && startTimeParam && endTimeParam) {
      // For timed events, construct Date objects from date and time components in detailer's timezone
      const [startYear, startMonth, startDay] = startDate.split('T')[0].split('-').map(Number);
      const [startHour, startMin] = startTimeParam.split(':').map(Number);
      
      // Create DateTime in detailer's timezone, then convert to UTC for storage
      const startDT = DateTime.fromObject(
        { year: startYear, month: startMonth, day: startDay, hour: startHour, minute: startMin },
        { zone: detailerTimezone }
      );
      startDateTime = startDT.toUTC().toJSDate();
      
      const endDateStr = (endDate || startDate).split('T')[0];
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      const [endHour, endMin] = endTimeParam.split(':').map(Number);
      
      const endDT = DateTime.fromObject(
        { year: endYear, month: endMonth, day: endDay, hour: endHour, minute: endMin },
        { zone: detailerTimezone }
      );
      endDateTime = endDT.toUTC().toJSDate();
      
      // Store time as provided (already in range format from frontend)
      startTime = time || null;
    } else {
      // For all-day events or events without separate time fields, parse normally
      // If it's a date string, treat it as midnight in detailer's timezone
      if (startDate.includes('T')) {
        startDateTime = new Date(startDate);
        endDateTime = new Date(endDate || startDate);
      } else {
        // Date only - set to midnight in detailer's timezone
        const [year, month, day] = startDate.split('-').map(Number);
        const startDT = DateTime.fromObject(
          { year, month, day, hour: 0, minute: 0 },
          { zone: detailerTimezone }
        );
        startDateTime = startDT.toUTC().toJSDate();
        
        if (endDate && !endDate.includes('T')) {
          const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
          const endDT = DateTime.fromObject(
            { year: endYear, month: endMonth, day: endDay, hour: 23, minute: 59 },
            { zone: detailerTimezone }
          );
          endDateTime = endDT.toUTC().toJSDate();
        } else {
          endDateTime = new Date(endDate || startDate);
        }
      }
      
      if (time) {
        // Use provided time (for all-day events with business hours)
        startTime = time;
      } else if (!isAllDay) {
        // For timed events without separate time fields, extract time from datetime
        // Convert back to detailer's timezone to get the local time
        const localDT = DateTime.fromJSDate(startDateTime, { zone: 'utc' }).setZone(detailerTimezone);
        startTime = `${String(localDT.hour).padStart(2, '0')}:${String(localDT.minute).padStart(2, '0')}`;
      }
    }
    // For all-day events without time, leave it null
    
    // Verify resource exists and belongs to this detailer (required)
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        detailerId
      }
    });
    
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found or does not belong to this detailer' }, { status: 404 });
    }

    // Verify employee exists and belongs to this detailer if employeeId is provided
    let employeeColor = color || 'blue';
    if (employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          detailerId
        }
      });
      
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found or does not belong to this detailer' }, { status: 404 });
      }
      // Use employee's color
      employeeColor = employee.color || 'blue';
    }
    
    const hasServices = Array.isArray(services) ? services.length > 0 : Boolean(services);
    const hasCustomerFields = Boolean(
      customerName || customerPhone || customerEmail || customerAddress || locationType || customerType || vehicleModel || hasServices
    );

    if (normalizedEventType === 'block' && hasCustomerFields) {
      return NextResponse.json({ error: 'Block time events cannot include customer or service data' }, { status: 400 });
    }

    let combinedDescription = description || '';
    if (normalizedEventType === 'appointment') {
      // Store customer, vehicle, and services info in description as JSON (for backward compatibility)
      const eventMetadata = {
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        locationType: locationType || null,
        customerType: customerType || null,
        vehicleModel: vehicleModel || null,
        services: services || null
      };
      
      // Combine description with metadata
      const fullDescription = description || '';
      const metadataJson = JSON.stringify(eventMetadata);
      combinedDescription = fullDescription 
        ? `${fullDescription}\n\n__METADATA__:${metadataJson}`
        : `__METADATA__:${metadataJson}`;
    }
    
    // Create the event in the database
    const event = await prisma.event.create({
      data: {
        detailerId,
        title: titleToUse,
        description: combinedDescription,
        date: startDateTime,
        time: startTime || null, // Store time for all-day events with business hours, null otherwise
        allDay: isAllDay || false,
        color: employeeColor, // Use employee's color or provided color
        employeeId: employeeId || null,
        resourceId: resourceId,
        eventType: normalizedEventType
      }
    });

    // Upsert CustomerSnapshot if customerPhone is provided
    if (normalizedEventType === 'appointment' && customerPhone) {
      try {
        const normalizedPhone = normalizeToE164(customerPhone) || customerPhone;
        
        // Get existing customer snapshot to merge notes
        const existingSnapshot = await prisma.customerSnapshot.findUnique({
          where: { 
            detailerId_customerPhone: { 
              detailerId, 
              customerPhone: normalizedPhone 
            } 
          }
        });
        
        // Prepare customer notes - merge with existing data if present
        const customerNotes = description || null;
        let snapshotData: any = existingSnapshot?.data ? (typeof existingSnapshot.data === 'object' ? existingSnapshot.data : {}) : {};
        if (customerNotes) {
          snapshotData.notes = customerNotes;
        }
        
        // Upsert CustomerSnapshot - store vehicleModel as-is (detailers only care about model)
        await upsertCustomerSnapshot(detailerId, normalizedPhone, {
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          address: customerAddress || null,
          locationType: locationType || null,
          customerType: customerType || null,
          vehicle: vehicleModel || null,
          vehicleModel: vehicleModel || null,
          services: services || null,
          data: Object.keys(snapshotData).length > 0 ? snapshotData : null
        });
        
        console.log('✅ CustomerSnapshot updated for phone:', normalizedPhone);
      } catch (snapshotError) {
        console.error('❌ Error updating CustomerSnapshot:', snapshotError);
        // Don't fail event creation if snapshot update fails
      }
    }

    // Get detailer's Google Calendar info for sync
    const detailerWithCalendar = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAppointments: true
      }
    });

    // Sync to Google Calendar if connected and sync is enabled
    let googleEventId = null;
    if (detailerWithCalendar?.googleCalendarConnected && 
        detailerWithCalendar.syncAppointments && 
        detailerWithCalendar.googleCalendarTokens) {
      
      try {
        const tokens = JSON.parse(detailerWithCalendar.googleCalendarTokens);
        
        // Create Google Calendar event using detailer's timezone
        const googleEvent = {
          summary: title,
          description: description || '',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: detailerTimezone
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: detailerTimezone
          },
          colorId: employeeColor === 'red' ? '11' : employeeColor === 'green' ? '10' : employeeColor === 'orange' ? '6' : '1'
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(googleEvent),
          }
        );

        if (response.ok) {
          const createdEvent = await response.json();
          googleEventId = createdEvent.id;
          
          // Update our event with Google Calendar ID
          await prisma.event.update({
            where: { id: event.id },
            data: { googleEventId }
          });
          
          console.log('✅ Event synced to Google Calendar:', googleEventId);
        } else {
          console.error('❌ Google Calendar sync failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Error syncing to Google Calendar:', error);
        // Don't fail the event creation if Google Calendar sync fails
      }
    }

    return NextResponse.json({ 
      success: true,
      event: {
        ...event,
        googleEventId
      },
      syncedToGoogle: !!googleEventId
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
