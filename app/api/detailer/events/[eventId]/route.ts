import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { normalizeToE164 } from '@/lib/phone';
import { upsertCustomerSnapshot } from '@/lib/customerSnapshot';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    const detailerId = session.user.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Verify the detailer exists
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { id: true, businessName: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Find the event first (check both events and bookings tables)
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        detailerId: detailerId
      }
    });

    // If not found in events table, check if it's a booking
    let booking = null;
    if (!event) {
      booking = await prisma.booking.findFirst({
        where: {
          id: eventId,
          detailerId: detailerId
        }
      });
    }

    // If neither event nor booking found in local database, it might be a Google Calendar-only event
    // In this case, we'll try to delete it directly from Google Calendar
    if (!event && !booking) {
      console.log('Event not found in local database, checking if it\'s a Google Calendar event');
      
      // Try to delete from Google Calendar directly
      try {
        // Get detailer's Google Calendar tokens
        const detailerWithTokens = await prisma.detailer.findUnique({
          where: { id: detailerId },
          select: {
            googleCalendarConnected: true,
            googleCalendarTokens: true,
            googleCalendarRefreshToken: true
          }
        });

        if (detailerWithTokens?.googleCalendarConnected && detailerWithTokens.googleCalendarTokens) {
          const tokens = JSON.parse(detailerWithTokens.googleCalendarTokens);
          const accessToken = tokens.access_token;

          // Try to delete from Google Calendar using the eventId as googleEventId
          const googleResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (googleResponse.ok) {
            console.log('Successfully deleted Google Calendar event:', eventId);
            return NextResponse.json({ 
              success: true,
              message: 'Google Calendar event deleted successfully' 
            });
          } else {
            console.log('Failed to delete Google Calendar event:', googleResponse.status, googleResponse.statusText);
            return NextResponse.json({ error: 'Event not found in Google Calendar either' }, { status: 404 });
          }
        } else {
          return NextResponse.json({ error: 'Event not found and Google Calendar not connected' }, { status: 404 });
        }
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
    }

    // Delete from database (either event or booking)
    if (event) {
      await prisma.event.delete({
        where: { id: eventId }
      });
    } else if (booking) {
      await prisma.booking.delete({
        where: { id: eventId }
      });
    }

    // If the event or booking has a Google Calendar ID, try to delete it from Google Calendar too
    const googleEventId = event?.googleEventId || booking?.googleEventId;
    if (googleEventId) {
      try {
        // Get detailer's Google Calendar tokens
        const detailerWithTokens = await prisma.detailer.findUnique({
          where: { id: detailerId },
          select: {
            googleCalendarConnected: true,
            googleCalendarTokens: true,
            googleCalendarRefreshToken: true
          }
        });

        if (detailerWithTokens?.googleCalendarConnected && detailerWithTokens.googleCalendarTokens) {
          const tokens = JSON.parse(detailerWithTokens.googleCalendarTokens);
          let accessToken = tokens.access_token;

          try {
            // Delete from Google Calendar
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (response.status === 404) {
              console.log(`Google Calendar event ${googleEventId} not found (404) - likely already deleted`);
              // Clear the Google ID from local database since it doesn't exist in Google Calendar
              if (event) {
                await prisma.event.update({
                  where: { id: eventId },
                  data: { googleEventId: null }
                });
              } else if (booking) {
                await prisma.booking.update({
                  where: { id: eventId },
                  data: { googleEventId: null }
                });
              }
            } else if (!response.ok) {
              console.error(`Google Calendar deletion failed: ${response.status} ${response.statusText}`);
            } else {
              console.log(`Successfully deleted Google Calendar event: ${googleEventId}`);
            }
          } catch (fetchError) {
            // If access token is expired, try to refresh it
            if (fetchError.message?.includes('401') || fetchError.message?.includes('unauthorized')) {
              console.log('Access token expired, refreshing...');
              try {
                const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: detailerWithTokens.googleCalendarRefreshToken!,
                    grant_type: 'refresh_token',
                  }),
                });

                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  accessToken = refreshData.access_token;
                  
                  // Update stored tokens
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

                  // Retry deletion with new token
                  const retryResponse = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
                    {
                      method: 'DELETE',
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                      },
                    }
                  );

                  if (retryResponse.status === 404) {
                    console.log(`Google Calendar event ${googleEventId} not found after token refresh (404) - likely already deleted`);
                    // Clear the Google ID from local database
                    if (event) {
                      await prisma.event.update({
                        where: { id: eventId },
                        data: { googleEventId: null }
                      });
                    } else if (booking) {
                      await prisma.booking.update({
                        where: { id: eventId },
                        data: { googleEventId: null }
                      });
                    }
                  } else if (retryResponse.ok) {
                    console.log(`Successfully deleted Google Calendar event after token refresh: ${googleEventId}`);
                  } else {
                    console.error(`Google Calendar deletion failed after token refresh: ${retryResponse.status} ${retryResponse.statusText}`);
                  }
                } else {
                  console.error('Failed to refresh Google Calendar token');
                }
              } catch (refreshError) {
                console.error('Error refreshing Google Calendar token:', refreshError);
              }
            } else {
              console.error('Google Calendar deletion error:', fetchError);
            }
          }
        }
      } catch (error) {
        console.error('Failed to delete from Google Calendar:', error);
        // Don't fail the deletion if Google Calendar deletion fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Event deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    const detailerId = session.user.id;
    const body = await request.json();
    const { title, color, employeeId, startDate, endDate, isAllDay, isMultiDay, description, resourceId, time, startTime: startTimeParam, endTime: endTimeParam, customerName, customerPhone, customerEmail, customerAddress, locationType, customerType, vehicleModel, services } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Find the event
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        detailerId: detailerId
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify resource exists if provided
    // If resourceId is provided in the update, validate it
    if (resourceId !== undefined) {
      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          detailerId
        }
      });
      
      if (!resource) {
        return NextResponse.json({ error: 'Resource not found or does not belong to this detailer' }, { status: 404 });
      }
    } else {
      // If resourceId is not provided, ensure the existing event has one
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId }
      });
      
      if (existingEvent && !existingEvent.resourceId) {
        return NextResponse.json({ error: 'Event must have a resource assigned. Please select a resource (Bay or Van).' }, { status: 400 });
      }
    }

    // Verify employee exists if provided and get their color
    let employeeColor = color || event.color || 'blue';
    if (employeeId !== undefined) {
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
      } else {
        // employeeId is null, clear it
        employeeColor = color || 'blue';
      }
    } else if (event.employeeId) {
      // Keep existing employee's color if employeeId not provided
      const existingEmployee = await prisma.employee.findFirst({
        where: {
          id: event.employeeId,
          detailerId
        }
      });
      if (existingEmployee) {
        employeeColor = existingEmployee.color || 'blue';
      }
    }

    // Get detailer's timezone
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { timezone: true }
    });
    const detailerTimezone = detailer?.timezone || 'America/New_York';

    // Parse dates
    // For timed events with separate time fields, construct Date objects in detailer's timezone
    let startDateTime: Date;
    let endDateTime: Date;
    let startTime: string | null = null;
    
    if (startDate) {
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
        if (startDate.includes('T')) {
          startDateTime = new Date(startDate);
          endDateTime = endDate ? new Date(endDate) : startDateTime;
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
            endDateTime = endDate ? new Date(endDate) : startDateTime;
          }
        }
        
        if (time !== undefined) {
          startTime = time;
        } else if (!isAllDay) {
          // Convert back to detailer's timezone to get the local time
          const localDT = DateTime.fromJSDate(startDateTime, { zone: 'utc' }).setZone(detailerTimezone);
          startTime = `${String(localDT.hour).padStart(2, '0')}:${String(localDT.minute).padStart(2, '0')}`;
        } else if (event.time) {
          startTime = event.time;
        }
      }
    } else {
      startDateTime = event.date;
      endDateTime = event.date;
      if (event.time) {
        startTime = event.time;
      }
    }

    // Handle description and metadata
    let finalDescription = description !== undefined ? description : event.description || '';
    
    // Extract existing metadata if present
    let existingMetadata: any = {};
    if (event.description && event.description.includes('__METADATA__:')) {
      const parts = event.description.split('__METADATA__:');
      finalDescription = parts[0].trim();
      try {
        existingMetadata = JSON.parse(parts[1] || '{}');
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Update metadata with new values
    const eventMetadata = {
      customerName: customerName !== undefined ? (customerName || null) : existingMetadata.customerName,
      customerPhone: customerPhone !== undefined ? (customerPhone || null) : existingMetadata.customerPhone,
      customerEmail: customerEmail !== undefined ? (customerEmail || null) : existingMetadata.customerEmail,
      customerAddress: customerAddress !== undefined ? (customerAddress || null) : existingMetadata.customerAddress,
      locationType: locationType !== undefined ? (locationType || null) : existingMetadata.locationType,
      customerType: customerType !== undefined ? (customerType || null) : existingMetadata.customerType,
      vehicleModel: vehicleModel !== undefined ? (vehicleModel || null) : existingMetadata.vehicleModel,
      services: services !== undefined ? (services || null) : existingMetadata.services,
      endDate: (isMultiDay && endDateTime) ? endDateTime.toISOString() : (existingMetadata.endDate || null)
    };
    
    // Combine description with metadata
    const metadataJson = JSON.stringify(eventMetadata);
    const combinedDescription = finalDescription 
      ? `${finalDescription}\n\n__METADATA__:${metadataJson}`
      : `__METADATA__:${metadataJson}`;
    
    // Check if any customer-related fields are being updated
    const hasCustomerUpdate = customerName !== undefined || 
                              customerPhone !== undefined || 
                              customerEmail !== undefined || 
                              customerAddress !== undefined ||
                              locationType !== undefined ||
                              customerType !== undefined ||
                              vehicleModel !== undefined ||
                              services !== undefined;
    
    // Update the event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(title !== undefined && { title }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        color: employeeColor, // Always update color based on employee
        ...(startDate && { date: startDateTime }),
        ...(time !== undefined && { time: startTime }),
        ...(isAllDay !== undefined && { allDay: isAllDay }),
        // Update description if description is provided OR if customer fields are being updated
        ...((description !== undefined || hasCustomerUpdate) && { description: combinedDescription }),
        ...(resourceId !== undefined && { resourceId: resourceId })
      }
    });

    // Upsert CustomerSnapshot if customerPhone is provided or updated
    const phoneToUse = customerPhone !== undefined ? customerPhone : existingMetadata.customerPhone;
    if (phoneToUse) {
      try {
        const normalizedPhone = normalizeToE164(phoneToUse) || phoneToUse;
        
        // Get the final values (use new values if provided, otherwise keep existing)
        const finalCustomerName = customerName !== undefined ? customerName : existingMetadata.customerName;
        const finalCustomerAddress = customerAddress !== undefined ? customerAddress : existingMetadata.customerAddress;
        const finalVehicleModel = vehicleModel !== undefined ? vehicleModel : existingMetadata.vehicleModel;
        const finalServices = services !== undefined ? services : existingMetadata.services;
        const finalDescription = description !== undefined ? description : (event.description && event.description.includes('__METADATA__:') ? event.description.split('__METADATA__:')[0].trim() : event.description || '');
        
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
        const customerNotes = finalDescription || null;
        let snapshotData: any = existingSnapshot?.data ? (typeof existingSnapshot.data === 'object' ? existingSnapshot.data : {}) : {};
        if (customerNotes) {
          snapshotData.notes = customerNotes;
        }
        
        const finalCustomerEmail = customerEmail !== undefined ? customerEmail : existingMetadata.customerEmail;
        const finalLocationType = locationType !== undefined ? locationType : existingMetadata.locationType;
        const finalCustomerType = customerType !== undefined ? customerType : existingMetadata.customerType;
        
        // Upsert CustomerSnapshot - store vehicleModel as-is (detailers only care about model)
        await upsertCustomerSnapshot(detailerId, normalizedPhone, {
          customerName: finalCustomerName || null,
          customerEmail: finalCustomerEmail || null,
          address: finalCustomerAddress || null,
          locationType: finalLocationType || null,
          customerType: finalCustomerType || null,
          vehicle: finalVehicleModel || null,
          vehicleModel: finalVehicleModel || null,
          services: finalServices || null,
          data: Object.keys(snapshotData).length > 0 ? snapshotData : null
        });
        
        console.log('✅ CustomerSnapshot updated for phone:', normalizedPhone);
      } catch (snapshotError) {
        console.error('❌ Error updating CustomerSnapshot:', snapshotError);
        // Don't fail event update if snapshot update fails
      }
    }

    // Update Google Calendar if connected
    if (event.googleEventId) {
      try {
        const detailerWithCalendar = await prisma.detailer.findUnique({
          where: { id: detailerId },
          select: {
            googleCalendarConnected: true,
            googleCalendarTokens: true,
            googleCalendarRefreshToken: true,
            syncAppointments: true
          }
        });

        if (detailerWithCalendar?.googleCalendarConnected && 
            detailerWithCalendar.syncAppointments && 
            detailerWithCalendar.googleCalendarTokens) {
          
          const tokens = JSON.parse(detailerWithCalendar.googleCalendarTokens);
          
          const googleEvent = {
            summary: title || event.title,
            description: description !== undefined ? description : event.description || '',
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
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent),
            }
          );

          if (!response.ok) {
            console.error('Google Calendar update failed:', response.status, response.statusText);
          } else {
            console.log('✅ Event updated in Google Calendar');
          }
        }
      } catch (error) {
        console.error('❌ Error syncing to Google Calendar:', error);
        // Don't fail the update if Google Calendar sync fails
      }
    }

    // Parse metadata from description to include customer fields in response
    let parsedMetadata: any = {};
    if (updatedEvent.description && updatedEvent.description.includes('__METADATA__:')) {
      const parts = updatedEvent.description.split('__METADATA__:');
      try {
        parsedMetadata = JSON.parse(parts[1] || '{}');
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Return event with parsed customer fields
    const eventResponse = {
      ...updatedEvent,
      customerName: parsedMetadata.customerName || null,
      customerPhone: parsedMetadata.customerPhone || null,
      customerEmail: parsedMetadata.customerEmail || null,
      customerAddress: parsedMetadata.customerAddress || null,
      locationType: parsedMetadata.locationType || null,
      customerType: parsedMetadata.customerType || null,
      vehicleModel: parsedMetadata.vehicleModel || null,
      services: parsedMetadata.services || null
    };

    return NextResponse.json({ 
      success: true,
      event: eventResponse
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
