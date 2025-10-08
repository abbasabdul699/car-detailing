import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate Google Calendar OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`;
    
    console.log('=== Google Calendar Connect Debug ===');
    console.log('GOOGLE_CLIENT_ID from env:', clientId);
    console.log('NEXTAUTH_URL from env:', process.env.NEXTAUTH_URL);
    console.log('Redirect URI:', redirectUri);
    console.log('Session user ID:', session.user.id);
    
    if (!clientId) {
      console.error('Google Client ID not found in environment variables');
      return NextResponse.json({ error: 'Google Calendar app not configured' }, { status: 500 });
    }

    // Google Calendar API scopes (including FreeBusy)
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy'
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${session.user.id}`;

    console.log('Generated auth URL:', authUrl);
    console.log('=== End Debug ===');

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Google Calendar connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google Calendar connection' }, { status: 500 });
  }
}
