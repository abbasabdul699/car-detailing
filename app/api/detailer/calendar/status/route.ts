import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAppointments: true,
        syncAvailability: true,
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Get calendar events count and next event
    let eventsCount = 0;
    let nextEvent = null;
    let lastSync = null;

    if (detailer.googleCalendarConnected && detailer.googleCalendarTokens) {
      try {
        // Parse tokens and get calendar info
        const tokens = JSON.parse(detailer.googleCalendarTokens);
        
        // This would typically involve calling Google Calendar API
        // For now, return mock data
        eventsCount = 5; // Mock data
        nextEvent = 'Tomorrow at 2:00 PM'; // Mock data
        lastSync = new Date().toISOString(); // Mock data
      } catch (error) {
        console.error('Error parsing calendar tokens:', error);
      }
    }

    return NextResponse.json({
      connected: detailer.googleCalendarConnected,
      lastSync,
      eventsCount,
      nextEvent,
      syncAppointments: detailer.syncAppointments,
      syncAvailability: detailer.syncAvailability,
    });

  } catch (error) {
    console.error('Error fetching calendar status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar status' },
      { status: 500 }
    );
  }
}
