import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Function to extract customer name from conversation messages
function extractCustomerNameFromMessages(messages: any[]): string | null {
  // Common words that are NOT names (to avoid false positives)
  const nonNameWords = new Set([
    'yes', 'no', 'yeah', 'yep', 'nope', 'ok', 'okay', 'sure', 'maybe', 'hi', 'hello', 'hey',
    'thanks', 'thank', 'please', 'sorry', 'help', 'stop', 'cancel', 'book', 'booking',
    'appointment', 'schedule', 'time', 'date', 'service', 'interior', 'exterior', 'wash',
    'detail', 'cleaning', 'car', 'vehicle', 'toyota', 'honda', 'ford', 'bmw', 'mercedes',
    'tesla', 'nissan', 'hyundai', 'kia', 'subaru', 'mazda', 'lexus', 'audi', 'volkswagen',
    'home', 'work', 'office', 'address', 'location', 'price', 'cost', 'money', 'payment'
  ]);

  // Look for patterns where customers provide their name
  const namePatterns = [
    // "My name is John" / "I'm John" / "Call me John"
    /(?:my name is|i'm|i am|name is|call me)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
    // "It's John" / "It is John"
    /(?:it's|it is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
  ];

  for (const message of messages) {
    if (message.direction === 'inbound') {
      const content = message.content.trim();
      const lowerContent = content.toLowerCase();
      
      // Skip very short responses or common non-name responses
      if (content.length < 2 || content.length > 100) continue;
      if (nonNameWords.has(lowerContent)) continue;
      
      for (const pattern of namePatterns) {
        const match = content.match(pattern);
        if (match) {
          const name = match[1].trim();
          const words = name.split(/\s+/);
          
          // Validate each word in the name
          let validName = true;
          for (const word of words) {
            if (word.length < 2 || word.length > 20 || !/^[a-zA-Z]+$/.test(word) || nonNameWords.has(word.toLowerCase())) {
              validName = false;
              break;
            }
          }
          
          if (validName && words.length <= 3) { // Max 3 words for names
            // Properly capitalize each word
            return words.map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          }
        }
      }
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
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

      console.log('🔍 [DEBUG] Fetched conversation messages:', {
        conversationId: conversation.id,
        messageCount: conversation.messages.length,
        messages: conversation.messages.map(m => ({
          id: m.id,
          direction: m.direction,
          contentLength: m.content?.length || 0,
          twilioSid: m.twilioSid,
          status: m.status,
          createdAt: m.createdAt
        }))
      });

      // Backfill AI setting default if missing
      if (!conversation.metadata || typeof conversation.metadata !== 'object' || !('aiEnabled' in conversation.metadata)) {
        const nextMetadata = {
          ...(typeof conversation.metadata === 'object' && conversation.metadata !== null ? conversation.metadata : {}),
          aiEnabled: false,
        };
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { metadata: nextMetadata },
        });
        conversation.metadata = nextMetadata;
      }

      // Only extract name from messages if not already set and no customer snapshot name
      if (!conversation.customerName && (!conversation.customer || !conversation.customer.firstName)) {
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
      
      // Use customer snapshot name if available and conversation doesn't have a name
      if (!conversation.customerName && conversation.customer?.firstName) {
        const snapshotName = conversation.customer.lastName 
          ? `${conversation.customer.firstName} ${conversation.customer.lastName}`
          : conversation.customer.firstName;
        
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { customerName: snapshotName },
        });
        conversation.customerName = snapshotName;
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

      // Backfill AI setting default for any conversation missing it
      const backfillUpdates = conversations.flatMap((conversation) => {
        const hasMetadata = typeof conversation.metadata === 'object' && conversation.metadata !== null;
        const hasAiEnabled = hasMetadata && Object.prototype.hasOwnProperty.call(conversation.metadata as Record<string, any>, 'aiEnabled');
        if (hasAiEnabled) {
          return [];
        }
        const nextMetadata = {
          ...(hasMetadata ? (conversation.metadata as Record<string, any>) : {}),
          aiEnabled: false,
        };
        conversation.metadata = nextMetadata;
        return [
          prisma.conversation.update({
            where: { id: conversation.id },
            data: { metadata: nextMetadata },
          }),
        ];
      });

      if (backfillUpdates.length > 0) {
        await prisma.$transaction(backfillUpdates);
      }

      // Extract customer names for conversations that don't have them
      const updatedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          // Use customer snapshot name if available and conversation doesn't have a name
          if (!conversation.customerName && conversation.customer?.firstName) {
            const snapshotName = conversation.customer.lastName 
              ? `${conversation.customer.firstName} ${conversation.customer.lastName}`
              : conversation.customer.firstName;
            
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { customerName: snapshotName },
            });
            conversation.customerName = snapshotName;
          }
          // Only extract from messages if no name available anywhere
          else if (!conversation.customerName && (!conversation.customer || !conversation.customer.firstName)) {
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, aiEnabled } = await request.json();
    if (!conversationId || typeof aiEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        detailerId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const nextMetadata = {
      ...(typeof conversation.metadata === 'object' && conversation.metadata !== null ? conversation.metadata : {}),
      aiEnabled,
    };

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { metadata: nextMetadata },
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        detailerId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId } }),
      prisma.conversation.delete({ where: { id: conversationId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
