import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHints } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const fromRaw = formData.get('From') as string;
    const toRaw = formData.get('To') as string;
    const from = normalizeToE164(fromRaw);
    const to = normalizeToE164(toRaw);
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

    // SMS COMPLIANCE: Check if this is a first-time customer for opt-in
    const existingSnapshot = await getCustomerSnapshot(detailer.id, from);
    const isFirstTimeCustomer = !existingSnapshot;
    
    console.log('SMS COMPLIANCE - isFirstTimeCustomer:', isFirstTimeCustomer);

    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    let responseMessage = '';

    if (isFirstTimeCustomer) {
      // First-time customer - ask for SMS consent (MANDATORY FOR TWILIO)
      responseMessage = `Hi! I'm Arian from ${detailer.businessName}. To help you book your mobile car detailing service, I'll need to send you appointment confirmations and updates via SMS. Is that okay with you?`;
      
      // Send the consent request
      const messageResponse = await client.messages.create({
        to: from,
        from: to,
        body: responseMessage
      });

      console.log('SENT CONSENT REQUEST:', messageResponse.sid);
    } else if (body && (body.toLowerCase().includes('yes') || body.toLowerCase().includes('okay') || body.toLowerCase().includes('sure') || body.toLowerCase().includes('ok'))) {
      // Customer agreed to SMS consent - send opt-in confirmation (MANDATORY)
      const optInMessage = `${detailer.businessName}: You are now opted-in to receive appointment confirmations and updates. For help, reply HELP. To opt-out, reply STOP.`;
      
      const optInResponse = await client.messages.create({
        to: from,
        from: to,
        body: optInMessage
      });

      console.log('SENT OPT-IN CONFIRMATION:', optInResponse.sid);

      // Then send a regular AI response
      responseMessage = `Awesome! What's your name?`;
      
      const aiResponse = await client.messages.create({
        to: from,
        from: to,
        body: responseMessage
      });

      console.log('SENT AI RESPONSE:', aiResponse.sid);
    } else {
      // Regular conversation - simple AI response
      responseMessage = `Thanks for reaching out! How can I help you today?`;
      
      const messageResponse = await client.messages.create({
        to: from,
        from: to,
        body: responseMessage
      });

      console.log('SENT REGULAR RESPONSE:', messageResponse.sid);
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

    // Check if we have enough information to create a booking
    const snapshot = await getCustomerSnapshot(detailer.id, from);
    if (snapshot && snapshot.customerName && snapshot.vehicle && snapshot.address && snapshot.services && snapshot.services.length > 0) {
      // Check if this looks like a booking request (mentions date/time)
      const hasDate = body && (body.toLowerCase().includes('tomorrow') || body.toLowerCase().includes('today') || body.toLowerCase().includes('monday') || body.toLowerCase().includes('tuesday') || body.toLowerCase().includes('wednesday') || body.toLowerCase().includes('thursday') || body.toLowerCase().includes('friday') || body.toLowerCase().includes('saturday') || body.toLowerCase().includes('sunday') || /\d{1,2}\/\d{1,2}/.test(body));
      const hasTime = body && (body.toLowerCase().includes('am') || body.toLowerCase().includes('pm') || body.toLowerCase().includes('morning') || body.toLowerCase().includes('afternoon') || body.toLowerCase().includes('evening'));
      
      if (hasDate || hasTime) {
        console.log('SMS BOOKING DETECTED - Creating booking from SMS conversation');
        
        // Create booking from SMS conversation
        const booking = await prisma.booking.create({
          data: {
            detailerId: detailer.id,
            customerPhone: from,
            customerName: snapshot.customerName,
            vehicleType: snapshot.vehicle,
            vehicleLocation: snapshot.address,
            services: snapshot.services,
            scheduledDate: new Date(), // Default to today, can be updated
            scheduledTime: '10:00 AM', // Default time
            status: 'pending',
            notes: `Booking created from SMS conversation`,
            conversationId: conversation.id
          }
        });

        console.log('SMS BOOKING CREATED:', booking.id);
        
        // Send booking confirmation
        const confirmationMessage = `Great! I've created a booking for you. Here are the details:
        
Service: ${snapshot.services.join(', ')}
Vehicle: ${snapshot.vehicle}
Location: ${snapshot.address}
Date: ${new Date().toLocaleDateString()}
Time: 10:00 AM

I'll confirm the exact time with you shortly. Is this correct?`;
        
        const confirmationResponse = await client.messages.create({
          to: from,
          from: to,
          body: confirmationMessage
        });

        console.log('SENT BOOKING CONFIRMATION:', confirmationResponse.sid);
      }
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