import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { signed_request } = await request.json();
    
    if (!signed_request) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    // Parse the signed request
    const [encodedSig, payload] = signed_request.split('.', 2);
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    
    if (data.user_id) {
      // Delete all Instagram-related data for the user
      await prisma.detailer.updateMany({
        where: {
          instagramBusinessAccountId: data.user_id
        },
        data: {
          instagramConnected: false,
          instagramTokens: null,
          instagramBusinessAccountId: null,
          instagramPageId: null,
          instagramDmEnabled: false,
          instagram: null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram data deletion error:', error);
    return NextResponse.json({ error: 'Failed to process data deletion' }, { status: 500 });
  }
}
