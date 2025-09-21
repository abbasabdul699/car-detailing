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

    // Remove Instagram connection from database
    await prisma.detailer.update({
      where: { id: session.user.id },
      data: {
        instagramConnected: false,
        instagramTokens: null,
        instagramBusinessAccountId: null,
        instagramPageId: null,
        instagramDmEnabled: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Instagram' }, { status: 500 });
  }
}
