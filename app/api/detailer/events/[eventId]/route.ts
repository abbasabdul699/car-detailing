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
