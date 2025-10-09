import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    // Get all conversations for this detailer
    const conversations = await prisma.conversation.findMany({
      where: { detailerId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Last 50 messages per conversation
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Format conversations for demo display
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      customerPhone: conv.customerPhone,
      customerName: conv.customerName || 'Customer',
      status: conv.status,
      lastMessageAt: conv.lastMessageAt,
      messageCount: conv.messages.length,
      lastMessage: conv.messages.length > 0 ? {
        content: conv.messages[conv.messages.length - 1].content,
        direction: conv.messages[conv.messages.length - 1].direction,
        createdAt: conv.messages[conv.messages.length - 1].createdAt
      } : null
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      total: formattedConversations.length
    });

  } catch (error) {
    console.error('Demo conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demo conversations' },
      { status: 500 }
    );
  }
}
