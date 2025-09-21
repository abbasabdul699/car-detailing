import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate Instagram OAuth URL
    const clientId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`;
    
    console.log('=== Instagram Connect Debug ===');
    console.log('INSTAGRAM_APP_ID from env:', clientId);
    console.log('NEXTAUTH_URL from env:', process.env.NEXTAUTH_URL);
    console.log('Redirect URI:', redirectUri);
    console.log('Session user ID:', session.user.id);
    
    if (!clientId) {
      console.error('Instagram App ID not found in environment variables');
      return NextResponse.json({ error: 'Instagram app not configured' }, { status: 500 });
    }

    // Use Instagram Business API scopes (after adding the product to your app)
    const scopes = [
      'instagram_basic',
      'instagram_business_basic', 
      'instagram_manage_messages',
      'pages_show_list'
    ];

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes.join(',')}&` +
      `response_type=code&` +
      `state=${session.user.id}`;

    console.log('Generated auth URL:', authUrl);
    console.log('=== End Debug ===');

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Instagram connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate Instagram connection' }, { status: 500 });
  }
}
