import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const redirectUri = `${nextAuthUrl}/api/detailer/calendar/callback`;
    
    return NextResponse.json({
      success: true,
      debug: {
        clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT_FOUND',
        nextAuthUrl,
        redirectUri,
        hasClientId: !!clientId,
        hasNextAuthUrl: !!nextAuthUrl
      }
    });

  } catch (error) {
    console.error('Debug Google Calendar error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error },
      { status: 500 }
    );
  }
}
