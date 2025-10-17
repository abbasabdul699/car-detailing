import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function refreshGoogleCalendarToken(refreshToken: string): Promise<string | null> {
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
      console.error('Failed to refresh Google Calendar token:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google Calendar token:', error);
    return null;
  }
}

async function createGoogleCalendarEvent(accessToken: string, event: any, detailer: any): Promise<string | null> {
  try {
    // Parse event time
    let startDateTime = new Date(event.date);
    let endDateTime = new Date(event.date);
    
    if (event.time) {
      // Parse time like "10:00 AM" or "14:00"
      const timeMatch = event.time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3]?.toLowerCase();
        
        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        
        startDateTime.setHours(hours, minutes, 0, 0);
        endDateTime = new Date(startDateTime.getTime() + 120 * 60000); // Default 2 hours
      }
    } else {
      // Full day event
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);
    }

    const googleEvent = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: detailer.timezone || 'America/New_York'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: detailer.timezone || 'America/New_York'
      },
      colorId: event.color === 'red' ? '11' : event.color === 'green' ? '10' : event.color === 'orange' ? '6' : '1'
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      console.error('Failed to create Google Calendar event:', response.status, response.statusText);
      return null;
    }

    const createdEvent = await response.json();
    return createdEvent.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        timezone: true,
      }
    });

    if (!detailer || !detailer.googleCalendarConnected || !detailer.googleCalendarTokens) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 400 });
    }

    // Parse tokens
    const tokens = JSON.parse(detailer.googleCalendarTokens);
    
    // Refresh access token
    const accessToken = await refreshGoogleCalendarToken(detailer.googleCalendarRefreshToken!);
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to refresh Google Calendar token' }, { status: 400 });
    }

    // Update stored tokens
    const updatedTokens = {
      ...tokens,
      access_token: accessToken,
    };
    
    await prisma.detailer.update({
      where: { id: detailer.id },
      data: {
        googleCalendarTokens: JSON.stringify(updatedTokens),
      },
    });

    // Fetch ALL existing Reeva events for full sync
    // We'll sync all events and update their Google Calendar IDs
    const existingEvents = await prisma.event.findMany({
      where: {
        detailerId: detailer.id,
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`🔄 Starting sync of ${existingEvents.length} events to Google Calendar...`);

    let syncedCount = 0;
    let failedCount = 0;

    // Sync each event to Google Calendar
    for (const event of existingEvents) {
      try {
        // Check if event already has a Google Calendar ID
        if (event.googleEventId) {
          console.log(`⏭️ Event "${event.title}" already has Google Calendar ID: ${event.googleEventId}`);
          syncedCount++;
          continue;
        }
        
        const googleEventId = await createGoogleCalendarEvent(accessToken, event, detailer);
        
        if (googleEventId) {
          // Update the event with Google Calendar ID
          await prisma.event.update({
            where: { id: event.id },
            data: { googleEventId }
          });
          
          syncedCount++;
          console.log(`✅ Synced event "${event.title}" to Google Calendar: ${googleEventId}`);
        } else {
          failedCount++;
          console.log(`❌ Failed to sync event "${event.title}"`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failedCount++;
        console.error(`❌ Error syncing event "${event.title}":`, error);
      }
    }

    console.log(`🎉 Sync complete! Synced: ${syncedCount}, Failed: ${failedCount}`);
    
    const newlySynced = syncedCount - existingEvents.filter(e => e.googleEventId).length;
    
    return NextResponse.json({ 
      success: true,
      message: `Calendar sync completed! ${newlySynced} new events synced, ${syncedCount} total events verified`,
      synced: syncedCount,
      newlySynced: newlySynced,
      failed: failedCount,
      total: existingEvents.length,
      lastSync: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error syncing calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
}
