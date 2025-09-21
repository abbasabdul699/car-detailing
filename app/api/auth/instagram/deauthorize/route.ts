import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { signed_request } = await request.json();
    
    if (!signed_request) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    // Parse the signed request (simplified - you might want to add proper validation)
    const [encodedSig, payload] = signed_request.split('.', 2);
    
    // Decode the payload
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    
    if (data.user_id) {
      // Remove Instagram connection from database
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
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram deauthorize error:', error);
    return NextResponse.json({ error: 'Failed to process deauthorization' }, { status: 500 });
  }
}
