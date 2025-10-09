import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message } = await request.json();

    if (!conversationId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get conversation details
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        detailer: {
          select: {
            id: true,
            businessName: true,
            twilioPhoneNumber: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the detailer owns this conversation
    if (conversation.detailerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized - not your conversation' }, { status: 403 });
    }

    // Send SMS via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: conversation.detailer.twilioPhoneNumber,
      to: conversation.customerPhone
    });

    // Save the outgoing message
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: message,
        twilioSid: twilioMessage.sid,
        status: 'sent'
      }
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

    console.log('🎭 Demo message sent:', {
      conversationId,
      from: conversation.detailer.twilioPhoneNumber,
      to: conversation.customerPhone,
      message: message.substring(0, 50) + '...',
      twilioSid: twilioMessage.sid
    });

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      twilioSid: twilioMessage.sid
    });

  } catch (error) {
    console.error('Demo send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send demo message' },
      { status: 500 }
    );
  }
}
