import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Verify conversation belongs to this detailer
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { detailerId: true }
    });

    if (!conversation || conversation.detailerId !== session.user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages for this conversation
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        direction: true,
        content: true,
        status: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      conversationId,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Demo conversation messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demo conversation messages' },
      { status: 500 }
    );
  }
}
