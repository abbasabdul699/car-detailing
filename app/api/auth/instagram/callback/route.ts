import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the detailer ID
    const error = searchParams.get('error');

    console.log('Instagram callback received:', { code: !!code, state, error });

    if (error) {
      console.error('Instagram OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=instagram_auth_failed`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=missing_parameters`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=token_exchange_failed`);
    }

    const { access_token } = tokenData;

    // Get Instagram Business Account ID
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${access_token}&fields=instagram_business_account`
    );
    
    const accountsData = await accountsResponse.json();
    
    if (!accountsResponse.ok || !accountsData.data?.length) {
      console.error('Failed to get Instagram Business Account:', accountsData);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=no_instagram_account`);
    }

    const pageWithInstagram = accountsData.data.find((page: any) => page.instagram_business_account);
    
    if (!pageWithInstagram?.instagram_business_account) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=no_instagram_business_account`);
    }

    const instagramBusinessAccountId = pageWithInstagram.instagram_business_account.id;
    const pageId = pageWithInstagram.id;

    // Get Instagram profile info (using instagram_business_basic permission)
    const profileResponse = await fetch(
      `https://graph.facebook.com/v21.0/${instagramBusinessAccountId}?fields=username,profile_picture_url&access_token=${access_token}`
    );
    
    const profileData = await profileResponse.json();

    // Store Instagram connection in database
    await prisma.detailer.update({
      where: { id: state },
      data: {
        instagramConnected: true,
        instagramTokens: JSON.stringify({
          access_token,
          expires_in: tokenData.expires_in,
        }),
        instagramBusinessAccountId,
        instagramPageId: pageId,
        instagram: profileData.username ? `https://instagram.com/${profileData.username}` : null,
      },
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?success=instagram_connected`);
  } catch (error) {
    console.error('Instagram callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/detailer-dashboard/profile?error=callback_failed`);
  }
}
