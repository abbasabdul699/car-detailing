import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { title, color, startDate, endDate, isAllDay, description } = body;

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
    
    // Extract time from datetime
    const startTime = startDateTime.toTimeString().slice(0, 5); // HH:MM format
    
    // Create the event in the database
    const event = await prisma.event.create({
      data: {
        detailerId,
        title,
        description: description || '',
        date: startDateTime,
        time: startTime,
        allDay: isAllDay || false,
        color: color || '#3B82F6'
      }
    });

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
          colorId: color === 'red' ? '11' : color === 'green' ? '10' : color === 'orange' ? '6' : '1'
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
