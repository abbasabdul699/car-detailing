import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/detailer/calendar/callback`;
    
    if (!clientId) {
      return NextResponse.json({ 
        error: 'Google Calendar integration not configured',
        clientId: 'NOT_FOUND'
      }, { status: 500 });
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=test-user-id`;

    return NextResponse.json({ 
      success: true,
      clientId,
      redirectUri,
      authUrl 
    });

  } catch (error) {
    console.error('Test Google Calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to generate test auth URL' },
      { status: 500 }
    );
  }
}
