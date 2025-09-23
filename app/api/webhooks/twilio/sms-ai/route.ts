import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper function to call OpenAI API for AI responses
async function getAIResponse(messages: any[], detailerInfo: any, conversationHistory: any[] = []) {
  try {
    const systemPrompt = `You are an AI assistant for ${detailerInfo.businessName}, a car detailing service. Your role is to help customers book appointments and answer questions about services.

Business Information:
- Business Name: ${detailerInfo.businessName}
- Location: ${detailerInfo.city}, ${detailerInfo.state}
- Services: ${detailerInfo.services?.map((s: any) => s.service?.name).join(', ') || 'Various car detailing services'}

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

    const conversationContext = conversationHistory.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    const currentMessage = messages[messages.length - 1];
    
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
          { role: 'user', content: currentMessage.content }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request. Please try again.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
  }
}

// Helper function to extract booking information from messages
function extractBookingInfo(messages: any[]) {
  const recentMessages = messages.slice(-10);
  const text = recentMessages.map(m => m.content).join(' ').toLowerCase();
  
  const bookingKeywords = ['book', 'appointment', 'schedule', 'reserve', 'available', 'time', 'date'];
  const isBookingRequest = bookingKeywords.some(keyword => text.includes(keyword));
  
  // Extract date patterns
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{1,2}-\d{1,2}-\d{4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];
  
  let extractedDate = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedDate = match[1];
      break;
    }
  }
  
  // Extract time patterns
  const timePatterns = [
    /(\d{1,2}:\d{2}\s*(am|pm))/i,
    /(\d{1,2}\s*(am|pm))/i
  ];
  
  let extractedTime = null;
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedTime = match[1];
      break;
    }
  }
  
  // Extract services
  const serviceKeywords = ['wash', 'detail', 'wax', 'interior', 'exterior', 'full', 'basic'];
  const extractedServices = serviceKeywords.filter(keyword => text.includes(keyword));
  
  return {
    isBookingRequest,
    extractedDate,
    extractedTime,
    extractedServices: extractedServices.length > 0 ? extractedServices : null
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI SMS WEBHOOK START ===');
    
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Incoming AI SMS message:', {
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
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
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
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20 // Last 20 messages for context
        }
      }
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
    console.log('Customer message:', body);
    console.log('Detailer:', detailer.businessName);

    // Get updated messages for AI processing
    const updatedMessages = [...conversation.messages, incomingMessage];

    // Get AI response
    console.log('Generating AI response...');
    const aiResponse = await getAIResponse(updatedMessages, detailer, conversation.messages);

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

    // Check if this is a booking request and extract information
    const bookingInfo = extractBookingInfo(updatedMessages);
    
    if (bookingInfo.isBookingRequest && bookingInfo.extractedDate) {
      // Create a pending booking
      const booking = await prisma.booking.create({
        data: {
          detailerId: conversation.detailerId,
          conversationId: conversation.id,
          customerPhone: from,
          scheduledDate: new Date(bookingInfo.extractedDate),
          scheduledTime: bookingInfo.extractedTime,
          services: bookingInfo.extractedServices,
          status: 'pending',
          notes: `AI booking request from SMS conversation`
        }
      });

      console.log('Booking created:', booking.id);
    }

    console.log('=== AI SMS WEBHOOK SUCCESS ===');
    console.log('AI Response:', aiResponse);
    console.log('Twilio Message SID:', twilioMessage.sid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      messageId: aiMessage.id,
      twilioSid: twilioMessage.sid,
      bookingCreated: bookingInfo.isBookingRequest
    });

  } catch (error) {
    console.error('=== AI SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
