import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHints } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== FAST SMS WEBHOOK START ===');
    
    const formData = await request.formData();
    const fromRaw = formData.get('From') as string;
    const toRaw = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const from = normalizeToE164(fromRaw) || fromRaw;
    const to = normalizeToE164(toRaw) || toRaw;
    
    console.log('Fast - Incoming message:', { from, to, body, messageSid });
    
    // Find the detailer quickly
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
    });

    if (!detailer) {
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
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Only get last 5 messages for faster processing
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
    const inbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    // Update snapshot with any hints from this message
    const inferred = extractSnapshotHints(body || '')
    if (Object.keys(inferred).length > 0) {
      await upsertCustomerSnapshot(detailer.id, from, inferred)
    }

    // Load snapshot for context
    const snapshot = await getCustomerSnapshot(detailer.id, from)

    // Generate conversational AI response
    const recentMessages = conversation.messages || [];
    const conversationHistory = recentMessages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemPrompt = `You are a friendly, conversational AI assistant for ${detailer.businessName}, a mobile car detailing service. 

IMPORTANT: Be conversational, engaging, and natural. Don't give generic responses. Respond like a real person would.

Business: ${detailer.businessName}
Location: ${detailer.city}, ${detailer.state}

Known customer context (if any):
Name: ${snapshot?.customerName || 'unknown'}
Vehicle: ${snapshot?.vehicle || [snapshot?.vehicleYear, snapshot?.vehicleMake, snapshot?.vehicleModel].filter(Boolean).join(' ') || 'unknown'}
Service Address: ${snapshot?.address || 'unknown'}

When customers ask about services:
- Be enthusiastic and helpful
- Ask follow-up questions
- Make it feel like a real conversation
- Don't repeat the same response

If they want to book:
- Ask for their name first
- Then ask about date/time preferences
- Ask about their vehicle
- Ask what services they need
- Ask for their address (where they want the mobile service)

IMPORTANT: This is a MOBILE service. We come to the customer's location. Never mention "our shop" or "our location" - always ask for their address where they want the service performed.

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
        max_tokens: 100, // Shorter responses for speed
        temperature: 0.8, // More creative and conversational
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Hey! Thanks for reaching out! What can I help you with today?';

    console.log('AI Response:', aiResponse);

    // Send response immediately
    let twilioSid: string | undefined
    const sendDisabled = process.env.TWILIO_SEND_DISABLED === '1'
    const hasTwilioCreds = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN
    if (!sendDisabled && hasTwilioCreds) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const tw = await client.messages.create({ to: from, from: to, body: aiResponse })
      twilioSid = tw.sid
    }

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        twilioSid: twilioSid,
        status: twilioSid ? 'sent' : 'simulated',
      },
    });

    console.log('=== FAST SMS WEBHOOK SUCCESS ===');
    if (twilioSid) console.log('Response sent:', twilioSid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      twilioSid: twilioSid
    });

  } catch (error) {
    console.error('=== FAST SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Fast webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
