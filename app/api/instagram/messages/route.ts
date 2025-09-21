import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch Instagram messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        instagramConnected: true,
        instagramTokens: true,
        instagramBusinessAccountId: true,
      },
    });

    if (!detailer?.instagramConnected || !detailer.instagramTokens || !detailer.instagramBusinessAccountId) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 });
    }

    const tokens = JSON.parse(detailer.instagramTokens);
    
    // Fetch conversations using instagram_manage_messages permission
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${detailer.instagramBusinessAccountId}/conversations?access_token=${tokens.access_token}&fields=participants,messages{id,from,message,created_time}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram API error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Instagram messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: Send Instagram message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId, message } = await request.json();

    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        instagramConnected: true,
        instagramTokens: true,
        instagramBusinessAccountId: true,
      },
    });

    if (!detailer?.instagramConnected || !detailer.instagramTokens || !detailer.instagramBusinessAccountId) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 });
    }

    const tokens = JSON.parse(detailer.instagramTokens);
    
    // Send message using instagram_manage_messages permission
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${detailer.instagramBusinessAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          access_token: tokens.access_token,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram send message error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Instagram send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
