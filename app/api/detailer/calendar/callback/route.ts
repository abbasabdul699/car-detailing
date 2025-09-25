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
        `${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=missing_parameters`
      );
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/detailer/calendar/callback`;
    
    console.log('Token exchange debug:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri,
      codeLength: code?.length
    });
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      console.error('Request details:', {
        clientId: clientId ? `${clientId.substring(0, 20)}...` : 'MISSING',
        hasClientSecret: !!clientSecret,
        redirectUri,
        status: tokenResponse.status
      });
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=token_exchange_failed`
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
      `${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?success=calendar_connected`
    );

  } catch (error) {
    console.error('Error in calendar callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=callback_failed`
    );
  }
}
