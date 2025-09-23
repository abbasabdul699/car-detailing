import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== STEP BY STEP TEST START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Step 1 - Incoming message:', { from, to, body, messageSid });
    
    // Step 2: Find detailer
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    console.log('Step 2 - Detailer found:', detailer.businessName);

    // Step 3: Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
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
      });
      console.log('Step 3 - Conversation created:', conversation.id);
    } else {
      console.log('Step 3 - Conversation found:', conversation.id);
    }

    // Step 4: Store incoming message
    const incomingMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    console.log('Step 4 - Message stored:', incomingMessage.id);

    // Step 5: Generate AI response
    const systemPrompt = `You are an AI assistant for ${detailer.businessName}, a car detailing service.`;
    
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
          { role: 'user', content: body }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request.';

    console.log('Step 5 - AI Response generated:', aiResponse);

    // Step 6: Store AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        status: 'sending',
      },
    });

    console.log('Step 6 - AI message stored:', aiMessage.id);

    // Step 7: Send via Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMessage = await client.messages.create({
      to: from,
      from: to,
      body: aiResponse
    });

    console.log('Step 7 - Twilio message sent:', twilioMessage.sid);

    // Step 8: Update message status
    await prisma.message.update({
      where: { id: aiMessage.id },
      data: {
        twilioSid: twilioMessage.sid,
        status: 'sent',
      },
    });

    console.log('Step 8 - Message status updated');

    return NextResponse.json({ 
      success: true,
      aiResponse,
      messageId: aiMessage.id,
      twilioSid: twilioMessage.sid,
      steps: 'All steps completed successfully'
    });

  } catch (error) {
    console.error('=== STEP BY STEP TEST ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Step by step test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
