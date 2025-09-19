import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Incoming Twilio message:', {
      from,
      to,
      body,
      messageSid,
    });

    // Find the detailer by their Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
    });

    if (!detailer) {
      console.error('No detailer found for Twilio number:', to);
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
    });

    if (!conversation) {
      // Create new conversation for incoming message
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    } else {
      // Update existing conversation
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Store the incoming message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    // TODO: Here you would integrate with your AI system
    // For now, we'll just log the message and return success
    console.log('Message stored for conversation:', conversation.id);
    console.log('Customer message:', body);
    console.log('Detailer:', detailer.businessName);

    // TODO: Process the message with AI and send response
    // This is where you would:
    // 1. Get conversation history
    // 2. Process with AI (OpenAI, etc.)
    // 3. Send response back to customer
    // 4. Store the outbound message

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Twilio webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}