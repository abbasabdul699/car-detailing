import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message } = body;

    if (!conversationId || !message) {
      return NextResponse.json({ 
        error: 'Conversation ID and message are required' 
      }, { status: 400 });
    }

    // Get the conversation and verify it belongs to the detailer
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        detailerId: session.user.id,
      },
      include: {
        detailer: {
          select: {
            twilioPhoneNumber: true,
            businessName: true,
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ 
        error: 'Conversation not found or access denied' 
      }, { status: 404 });
    }

    if (!conversation.detailer.twilioPhoneNumber) {
      return NextResponse.json({ 
        error: 'Detailer phone number not configured' 
      }, { status: 400 });
    }

    // Send the message via Twilio
    let twilioMessage;
    try {
      twilioMessage = await client.messages.create({
        body: message,
        from: conversation.detailer.twilioPhoneNumber,
        to: conversation.customerPhone,
      });
    } catch (twilioError: any) {
      console.error('Twilio error:', twilioError);
      return NextResponse.json({ 
        error: 'Failed to send message via Twilio' 
      }, { status: 500 });
    }

    // Save the message to the database
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversationId,
        direction: 'outbound',
        content: message,
        twilioSid: twilioMessage.sid,
        status: twilioMessage.status || 'sent',
      },
    });

    // Update the conversation's last message timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        status: 'active',
      },
    });

    return NextResponse.json({ 
      message: savedMessage,
      twilioSid: twilioMessage.sid 
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
