import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get specific conversation with messages
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          detailerId: session.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          customer: true,
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      return NextResponse.json(conversation);
    } else {
      // Get all conversations for the detailer
      const conversations = await prisma.conversation.findMany({
        where: {
          detailerId: session.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get the latest message for preview
          },
          customer: true,
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      return NextResponse.json(conversations);
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
