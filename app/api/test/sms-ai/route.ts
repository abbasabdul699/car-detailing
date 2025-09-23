import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { detailerId, customerPhone, message } = body;

    if (!detailerId || !customerPhone || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: detailerId, customerPhone, message' 
      }, { status: 400 });
    }

    // Get detailer info
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
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

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: customerPhone,
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
          customerPhone: customerPhone,
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Store the test message
    const testMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: message,
        status: 'received',
      },
    });

    // Get updated messages for AI processing
    const updatedMessages = [...(conversation.messages || []), testMessage];

    // Generate AI response using the same logic as the webhook
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
          { role: 'user', content: message }
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

    // Store the AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        status: 'sent',
      },
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      customerMessage: message,
      aiResponse: aiResponse,
      detailer: {
        id: detailer.id,
        businessName: detailer.businessName,
        city: detailer.city,
        state: detailer.state
      },
      messageId: aiMessage.id
    });

  } catch (error) {
    console.error('SMS AI test error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
