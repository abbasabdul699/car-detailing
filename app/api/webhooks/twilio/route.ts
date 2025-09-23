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

    console.log('Message stored for conversation:', conversation.id);
    console.log('Customer message:', body);
    console.log('Detailer:', detailer.businessName);

    // Process the message with AI using sms-fast endpoint
    try {
      const aiResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/webhooks/twilio/sms-fast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: body,
          MessageSid: messageSid
        })
      });

      if (aiResponse.ok) {
        const result = await aiResponse.json();
        console.log('AI processed message successfully:', result);
      } else {
        console.error('AI processing failed:', await aiResponse.text());
      }
    } catch (error) {
      console.error('Error calling AI conversation API:', error);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Twilio webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}