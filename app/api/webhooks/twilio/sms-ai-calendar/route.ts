import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';
import { GoogleCalendarService } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CALENDAR AI SMS WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Calendar AI - Incoming message:', { from, to, body, messageSid });
    
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
          orderBy: { createdAt: 'desc' },
          take: 5
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

    // Check if detailer has Google Calendar connected
    let calendarService = null;
    let availableSlots: string[] = [];
    
    if (detailer.googleCalendarConnected && detailer.googleCalendarTokens) {
      try {
        const tokens = JSON.parse(detailer.googleCalendarTokens);
        calendarService = new GoogleCalendarService(tokens.access_token, tokens.refresh_token);
        
        // Get available slots for today and tomorrow
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        availableSlots = [
          ...(await calendarService.getAvailableSlots(today)),
          ...(await calendarService.getAvailableSlots(tomorrow))
        ];
        
        console.log('Available slots found:', availableSlots.length);
      } catch (error) {
        console.error('Error accessing calendar:', error);
      }
    }

    // Generate AI response with calendar integration
    const recentMessages = conversation.messages || [];
    const conversationHistory = recentMessages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemPrompt = `You are a friendly, conversational AI assistant for ${detailer.businessName}, a car detailing service. 

IMPORTANT: Be conversational, engaging, and natural. Don't give generic responses. Respond like a real person would.

Business: ${detailer.businessName}
Location: ${detailer.city}, ${detailer.state}
Services: ${detailer.services?.map((s: any) => s.service?.name).join(', ') || 'Various car detailing services'}

CALENDAR INTEGRATION:
${calendarService ? `✅ Calendar Connected - I can check real-time availability` : '❌ Calendar Not Connected - I can only provide general availability'}

${availableSlots.length > 0 ? `Available slots: ${availableSlots.slice(0, 5).map(slot => new Date(slot).toLocaleString()).join(', ')}` : ''}

When customers ask about availability:
- If calendar is connected: Check real-time availability and suggest specific times
- If calendar is not connected: Suggest general availability and ask them to call

If they want to book:
- Ask for their name first
- Then ask about date/time preferences
- If calendar is connected, suggest available slots
- Ask about their vehicle
- Ask what services they need

Keep responses under 160 characters and conversational.`;

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
          ...conversationHistory,
          { role: 'user', content: body }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Hey! Thanks for reaching out! What can I help you with today?';

    console.log('AI Response:', aiResponse);

    // Send response immediately
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMessage = await client.messages.create({
      to: from,
      from: to,
      body: aiResponse
    });

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        twilioSid: twilioMessage.sid,
        status: 'sent',
      },
    });

    console.log('=== CALENDAR AI SMS WEBHOOK SUCCESS ===');
    console.log('Response sent:', twilioMessage.sid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      twilioSid: twilioMessage.sid,
      calendarConnected: !!calendarService,
      availableSlots: availableSlots.length
    });

  } catch (error) {
    console.error('=== CALENDAR AI SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Calendar AI webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
