import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { normalizeToE164 } from '@/lib/phone';
import { upsertCustomerSnapshot } from '@/lib/customerSnapshot';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { title, color, employeeId, startDate, endDate, isAllDay, description, resourceId, time, customerName, customerPhone, customerEmail, customerAddress, locationType, vehicleModel, services } = body;

    if (!title || !startDate) {
      return NextResponse.json({ error: 'Title and start date are required' }, { status: 400 });
    }

    // Verify the detailer exists
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { id: true, businessName: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Parse the start and end dates
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate || startDate);
    
    // Extract time from datetime or use provided time
    // For all-day events with business hours, use the provided time
    // For timed events, extract from datetime
    let startTime: string | null = null;
    if (time) {
      // Use provided time (for all-day events with business hours)
      startTime = time;
    } else if (!isAllDay) {
      // For timed events, extract time from datetime
      startTime = startDateTime.toTimeString().slice(0, 5); // HH:MM format
    }
    // For all-day events without time, leave it null
    
    // Verify resource exists and belongs to this detailer if resourceId is provided
    if (resourceId) {
      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          detailerId
        }
      });
      
      if (!resource) {
        return NextResponse.json({ error: 'Resource not found or does not belong to this detailer' }, { status: 404 });
      }
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
    
    // Store customer, vehicle, and services info in description as JSON (for backward compatibility)
    const eventMetadata = {
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerAddress: customerAddress || null,
      vehicleModel: vehicleModel || null,
      services: services || null
    };
    
    // Combine description with metadata
    const fullDescription = description || '';
    const metadataJson = JSON.stringify(eventMetadata);
    const combinedDescription = fullDescription 
      ? `${fullDescription}\n\n__METADATA__:${metadataJson}`
      : `__METADATA__:${metadataJson}`;
    
    // Create the event in the database
    const event = await prisma.event.create({
      data: {
        detailerId,
        title,
        description: combinedDescription,
        date: startDateTime,
        time: startTime || null, // Store time for all-day events with business hours, null otherwise
        allDay: isAllDay || false,
        color: employeeColor, // Use employee's color or provided color
        employeeId: employeeId || null,
        resourceId: resourceId || null
      }
    });

    // Upsert CustomerSnapshot if customerPhone is provided
    if (customerPhone) {
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
        
        // Create Google Calendar event
        const googleEvent = {
          summary: title,
          description: description || '',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'America/New_York'
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
