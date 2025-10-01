import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Function to extract customer name from conversation messages
function extractCustomerNameFromMessages(messages: any[]): string | null {
  // Look for patterns where customers provide their name
  const namePatterns = [
    // "My name is John"
    /(?:my name is|i'm|i am|name is|call me)\s+([a-zA-Z]+)/i,
    // "John" (simple response to "What's your name?")
    /^([a-zA-Z]{2,20})$/,
    // "It's John"
    /(?:it's|it is)\s+([a-zA-Z]+)/i,
  ];

  for (const message of messages) {
    if (message.direction === 'inbound') {
      const content = message.content.toLowerCase().trim();
      
      // Skip very short or very long responses
      if (content.length < 2 || content.length > 50) continue;
      
      for (const pattern of namePatterns) {
        const match = content.match(pattern);
        if (match) {
          const name = match[1];
          // Validate it looks like a real name
          if (name.length >= 2 && name.length <= 20 && /^[a-zA-Z]+$/.test(name)) {
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          }
        }
      }
    }
  }
  
  return null;
}

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

      // Extract customer name from messages if not already set
      const extractedName = extractCustomerNameFromMessages(conversation.messages);
      if (extractedName && !conversation.customerName) {
        // Update the conversation with the extracted name
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { customerName: extractedName },
        });
        conversation.customerName = extractedName;
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
            take: 5, // Get more messages to extract names
          },
          customer: true,
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      // Extract customer names for conversations that don't have them
      const updatedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          if (!conversation.customerName) {
            const extractedName = extractCustomerNameFromMessages(conversation.messages);
            if (extractedName) {
              // Update the conversation with the extracted name
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { customerName: extractedName },
              });
              conversation.customerName = extractedName;
            }
          }
          return conversation;
        })
      );

      return NextResponse.json(updatedConversations);
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
