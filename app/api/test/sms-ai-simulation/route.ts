import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SMS AI SIMULATION TEST START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Simulation - Incoming message:', { from, to, body, messageSid });
    
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

    console.log('Simulation - Detailer found:', detailer.businessName);

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
      console.log('Simulation - Conversation created:', conversation.id);
    } else {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
      console.log('Simulation - Conversation updated:', conversation.id);
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

    console.log('Simulation - Message stored:', incomingMessage.id);

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
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request. Please try again.';

    console.log('Simulation - AI Response generated:', aiResponse);

    // Store the AI response (but don't send SMS)
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        status: 'simulated', // Mark as simulated instead of sending
      },
    });

    console.log('Simulation - AI message stored:', aiMessage.id);

    return NextResponse.json({ 
      success: true,
      message: 'SMS AI simulation completed successfully',
      aiResponse,
      messageId: aiMessage.id,
      conversationId: conversation.id,
      detailer: detailer.businessName,
      note: 'SMS was not sent (simulation mode)'
    });

  } catch (error) {
    console.error('=== SMS AI SIMULATION ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'SMS AI simulation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
