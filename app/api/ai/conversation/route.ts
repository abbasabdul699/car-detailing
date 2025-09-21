import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper function to call OpenAI API
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
  const recentMessages = messages.slice(-10); // Look at last 10 messages
  const text = recentMessages.map(msg => msg.content).join(' ');
  
  // Simple keyword detection for booking intent
  const bookingKeywords = ['book', 'schedule', 'appointment', 'available', 'time', 'date', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const serviceKeywords = ['wash', 'detail', 'cleaning', 'interior', 'exterior', 'full detail', 'wax', 'polish'];
  
  const hasBookingIntent = bookingKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const hasServiceIntent = serviceKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  return {
    isBookingRequest: hasBookingIntent || hasServiceIntent,
    extractedServices: serviceKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ),
    extractedDate: extractDateFromText(text),
    extractedTime: extractTimeFromText(text)
  };
}

// Helper function to extract date from text
function extractDateFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  const today = new Date();
  
  // Check for relative dates
  if (lowerText.includes('today')) return today.toISOString().split('T')[0];
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Check for day names (next occurrence)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) {
    if (lowerText.includes(day)) {
      const dayIndex = days.indexOf(day);
      const nextDay = new Date(today);
      const currentDayIndex = today.getDay() === 0 ? 7 : today.getDay(); // Sunday = 7
      const daysUntil = (dayIndex + 1) - currentDayIndex;
      nextDay.setDate(nextDay.getDate() + (daysUntil <= 0 ? daysUntil + 7 : daysUntil));
      return nextDay.toISOString().split('T')[0];
    }
  }
  
  return null;
}

// Helper function to extract time from text
function extractTimeFromText(text: string): string | null {
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/;
  const match = text.match(timeRegex);
  
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message } = body;

    if (!conversationId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get conversation with detailer info
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        detailer: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20 // Last 20 messages for context
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Store the incoming message
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        direction: 'inbound',
        content: message,
        status: 'received',
      }
    });

    // Get updated messages for AI processing
    const updatedMessages = [...conversation.messages, newMessage];

    // Get AI response
    const aiResponse = await getAIResponse(updatedMessages, conversation.detailer, conversation.messages);

    // Store the AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        content: aiResponse,
        status: 'sent',
      }
    });

    // Send SMS response via Twilio
    await client.messages.create({
      to: conversation.customerPhone,
      from: conversation.detailer.twilioPhoneNumber,
      body: aiResponse
    });

    // Check if this is a booking request and extract information
    const bookingInfo = extractBookingInfo(updatedMessages);
    
    if (bookingInfo.isBookingRequest && bookingInfo.extractedDate) {
      // Create a pending booking
      const booking = await prisma.booking.create({
        data: {
          detailerId: conversation.detailerId,
          conversationId,
          customerPhone: conversation.customerPhone,
          scheduledDate: new Date(bookingInfo.extractedDate),
          scheduledTime: bookingInfo.extractedTime,
          services: bookingInfo.extractedServices,
          status: 'pending',
          notes: `AI booking request from SMS conversation`
        }
      });

      console.log('Booking created:', booking.id);
    }

    return NextResponse.json({ 
      success: true,
      aiResponse,
      messageId: aiMessage.id,
      bookingCreated: bookingInfo.isBookingRequest
    });

  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
