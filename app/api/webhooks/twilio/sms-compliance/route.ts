import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHints } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SMS COMPLIANCE WEBHOOK START ===');
    
    const formData = await request.formData();
    const fromRaw = formData.get('From') as string;
    const toRaw = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    // Normalize phone numbers to E.164 format
    const from = normalizeToE164(fromRaw);
    const to = normalizeToE164(toRaw);

    console.log('Incoming message:', { from, to, body, messageSid });

    // Find detailer by Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
      },
    });

    if (!detailer) {
      console.error('No detailer found for Twilio number:', to);
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Check if this is a first-time customer BEFORE updating snapshot
    const existingSnapshot = await getCustomerSnapshot(detailer.id, from);
    const isFirstTimeCustomer = !existingSnapshot;
    
    console.log('DEBUG: isFirstTimeCustomer:', isFirstTimeCustomer);
    console.log('DEBUG: existingSnapshot:', existingSnapshot);

    // Get or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
        include: {
          messages: true,
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Store incoming message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    let responseMessage = '';
    let optInSent = false;

    if (isFirstTimeCustomer) {
      // First-time customer - ask for SMS consent
      responseMessage = `Hi! I'm Arian from ${detailer.businessName}. To help you book your mobile car detailing service, I'll need to send you appointment confirmations and updates via SMS. Is that okay with you?`;
      
      // Send the consent request
      const messageResponse = await client.messages.create({
        to: from,
        from: to,
        body: responseMessage
      });

      console.log('Sent consent request:', messageResponse.sid);
    } else if (body && (body.toLowerCase().includes('yes') || body.toLowerCase().includes('okay') || body.toLowerCase().includes('sure') || body.toLowerCase().includes('ok'))) {
      // Customer agreed to SMS consent - send opt-in confirmation
      const optInMessage = `${detailer.businessName}: You are now opted-in to receive appointment confirmations and updates. For help, reply HELP. To opt-out, reply STOP.`;
      
      const optInResponse = await client.messages.create({
        to: from,
        from: to,
        body: optInMessage
      });

      console.log('Sent opt-in confirmation:', optInResponse.sid);
      optInSent = true;

      // Then send a regular AI response
      responseMessage = `Awesome! What's your name?`;
      
      const aiResponse = await client.messages.create({
        to: from,
        from: to,
        body: responseMessage
      });

      console.log('Sent AI response:', aiResponse.sid);
    } else {
      // Regular conversation - simple AI response
      responseMessage = `Thanks for reaching out! How can I help you today?`;
      
      const messageResponse = await client.messages.create({
        to: from,
        from: to,
        body: responseMessage
      });

      console.log('Sent regular response:', messageResponse.sid);
    }

    // Store outbound message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: responseMessage,
        status: 'sent',
      },
    });

    // Update customer snapshot
    const inferred = extractSnapshotHints(body || '');
    if (Object.keys(inferred).length > 0) {
      await upsertCustomerSnapshot(detailer.id, from, inferred);
    }

    console.log('=== SMS COMPLIANCE WEBHOOK SUCCESS ===');
    
    return NextResponse.json({ 
      success: true,
      isFirstTimeCustomer,
      optInSent,
      message: responseMessage
    });

  } catch (error) {
    console.error('=== SMS COMPLIANCE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'SMS compliance webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
