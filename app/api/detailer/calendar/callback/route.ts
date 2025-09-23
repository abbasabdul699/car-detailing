import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the detailer ID
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/detailer-dashboard/calendar-settings?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/detailer-dashboard/calendar-settings?error=missing_parameters`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/detailer/calendar/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/detailer-dashboard/calendar-settings?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in database
    await prisma.detailer.update({
      where: { id: state },
      data: {
        googleCalendarConnected: true,
        googleCalendarTokens: JSON.stringify(tokens),
        googleCalendarRefreshToken: tokens.refresh_token,
        syncAppointments: true,
        syncAvailability: true,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/detailer-dashboard/calendar-settings?success=calendar_connected`
    );

  } catch (error) {
    console.error('Error in calendar callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/detailer-dashboard/calendar-settings?error=callback_failed`
    );
  }
}
