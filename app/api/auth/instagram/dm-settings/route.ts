import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dmEnabled } = await request.json();

    // Update DM settings in database
    await prisma.detailer.update({
      where: { id: session.user.id },
      data: {
        instagramDmEnabled: dmEnabled,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram DM settings error:', error);
    return NextResponse.json({ error: 'Failed to update DM settings' }, { status: 500 });
  }
}
