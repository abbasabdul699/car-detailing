import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
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

    // Find and delete the event
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        detailerId: detailerId
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete the event from database
    await prisma.event.delete({
      where: { id: eventId }
    });

    // If the event has a Google Calendar ID, try to delete it from Google Calendar too
    if (event.googleEventId) {
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

          // Delete from Google Calendar
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
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
