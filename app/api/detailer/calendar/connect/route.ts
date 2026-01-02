import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
    console.log('API Route - Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasId: !!session?.user?.id,
      userId: session?.user?.id 
    });
    
    if (!session?.user?.id) {
      console.error('API Route - No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate Google OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/detailer/calendar/callback`;
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Calendar integration not configured' },
        { status: 500 }
      );
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
      `state=${session.user.id}`;

    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error('Error generating calendar auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
