import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the detailer ID
    const error = searchParams.get('error');

    console.log('Google Calendar callback received:', { code: !!code, state, error });

    if (error) {
      console.error('Google Calendar OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=google_calendar_auth_failed`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=missing_parameters`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`,
        grant_type: 'authorization_code',
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Store Google Calendar connection in database
    await prisma.detailer.update({
      where: { id: state },
      data: {
        googleCalendarConnected: true,
        googleCalendarTokens: JSON.stringify({
          access_token,
          expires_in,
          token_type: tokenData.token_type,
        }),
        googleCalendarRefreshToken: refresh_token,
      },
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?success=google_calendar_connected`);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=callback_failed`);
  }
}
