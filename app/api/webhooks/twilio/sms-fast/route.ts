import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== WORKING SMS AI WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Working - Incoming message:', { from, to, body, messageSid });
    
    // Find the detailer
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (!detailer) {
      console.log('No detailer found for Twilio number:', to);
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    console.log('Detailer found:', detailer.businessName);

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    } else {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Store the incoming message
    const incomingMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    console.log('Message stored for conversation:', conversation.id);

    // Generate AI response
    const systemPrompt = `You are an AI assistant for ${detailer.businessName}, a car detailing service. Your role is to help customers book appointments and answer questions about services.

Business Information:
- Business Name: ${detailer.businessName}
- Location: ${detailer.city}, ${detailer.state}
- Services: ${detailer.services?.map((s: any) => s.service?.name).join(', ') || 'Various car detailing services'}

Your capabilities:
1. Help customers book appointments
2. Answer questions about services and pricing
3. Provide information about availability
4. Collect necessary details for booking (date, time, vehicle type, services needed)

When booking appointments:
- Ask for preferred date and time
- Ask about the vehicle (type, model, year)
- Ask what services they need
- Ask where the vehicle is located
- Confirm all details before finalizing

Be friendly, professional, and helpful. Keep responses concise but informative.`;

    const conversationContext = (conversation.messages || []).map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));
    
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationContext,
          { role: 'user', content: body }
        ],
            max_tokens: 200,
        temperature: 0.7,
          }),
        });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request. Please try again.';

    // Check if this looks like a booking confirmation and add calendar link
    if (aiResponse.toLowerCase().includes('booking') || aiResponse.toLowerCase().includes('appointment') || aiResponse.toLowerCase().includes('confirmed')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com';
      const calendarUrl = `${baseUrl}/api/calendar/add/demo`;
      aiResponse += `\n\n📅 Add to calendar: ${calendarUrl}`;
    }

    console.log('AI Response generated:', aiResponse);

    // Store the AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        status: 'sending',
      },
    });

    // Send SMS response via Twilio
    console.log('Sending AI response via Twilio...');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMessage = await client.messages.create({
      to: from,
      from: to,
      body: aiResponse
    });

    // Update the message with Twilio SID
    await prisma.message.update({
      where: { id: aiMessage.id },
          data: {
        twilioSid: twilioMessage.sid,
        status: 'sent',
      },
    });

    console.log('=== WORKING SMS AI WEBHOOK SUCCESS ===');
    console.log('AI Response:', aiResponse);
    console.log('Twilio Message SID:', twilioMessage.sid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      messageId: aiMessage.id,
      twilioSid: twilioMessage.sid
    });

  } catch (error) {
    console.error('=== WORKING SMS AI WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
