import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper function to get AI response for voice
async function getVoiceAIResponse(transcription: string, detailerInfo: any, conversationHistory: any[] = []) {
  try {
    const systemPrompt = `You are an AI voice assistant for ${detailerInfo.businessName}, a car detailing service. You are speaking to a customer on the phone.

Business Information:
- Business Name: ${detailerInfo.businessName}
- Location: ${detailerInfo.city}, ${detailerInfo.state}
- Services: ${detailerInfo.services?.map((s: any) => s.service?.name).join(', ') || 'Various car detailing services'}

Your role:
1. Help customers book appointments
2. Answer questions about services and pricing
3. Collect necessary details for booking (date, time, vehicle type, services needed)
4. Provide information about availability

When booking appointments:
- Ask for preferred date and time
- Ask about the vehicle (type, model, year)
- Ask what services they need
- Ask where the vehicle is located
- Confirm all details before finalizing

Be conversational, friendly, and professional. Keep responses concise but informative. Speak naturally as if you're a real person.`;

    const conversationContext = conversationHistory.map(msg => ({
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
          { role: 'user', content: transcription }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I had trouble understanding you. Could you please repeat that?';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'I apologize, but I\'m having trouble processing your request right now. Please try again.';
  }
}

// Helper function to convert text to speech using Twilio
function textToSpeech(text: string): string {
  // Clean up the text for better speech synthesis
  let cleanText = text
    .replace(/[^\w\s.,!?]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Add pauses for better speech flow
  cleanText = cleanText
    .replace(/\./g, '. <break time="0.5s"/>')
    .replace(/,/g, ', <break time="0.3s"/>')
    .replace(/\?/g, '? <break time="0.5s"/>')
    .replace(/!/g, '! <break time="0.5s"/>');

  return cleanText;
}

// Helper function to extract booking information from voice transcription
function extractBookingInfo(transcription: string, conversationHistory: any[]) {
  const recentMessages = conversationHistory.slice(-10); // Look at last 10 messages
  const allText = [transcription, ...recentMessages.map(msg => msg.content)].join(' ');
  const lowerText = allText.toLowerCase();
  
  // Simple keyword detection for booking intent
  const bookingKeywords = ['book', 'schedule', 'appointment', 'available', 'time', 'date', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const serviceKeywords = ['wash', 'detail', 'cleaning', 'interior', 'exterior', 'full detail', 'wax', 'polish'];
  
  const hasBookingIntent = bookingKeywords.some(keyword => lowerText.includes(keyword));
  const hasServiceIntent = serviceKeywords.some(keyword => lowerText.includes(keyword));

  // Extract date information
  let extractedDate = null;
  const today = new Date();
  
  if (lowerText.includes('today')) {
    extractedDate = today.toISOString().split('T')[0];
  } else if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    extractedDate = tomorrow.toISOString().split('T')[0];
  } else {
    // Check for day names (next occurrence)
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (lowerText.includes(day)) {
        const dayIndex = days.indexOf(day);
        const nextDay = new Date(today);
        const currentDayIndex = today.getDay() === 0 ? 7 : today.getDay();
        const daysUntil = (dayIndex + 1) - currentDayIndex;
        nextDay.setDate(nextDay.getDate() + (daysUntil <= 0 ? daysUntil + 7 : daysUntil));
        extractedDate = nextDay.toISOString().split('T')[0];
        break;
      }
    }
  }

  // Extract time information
  let extractedTime = null;
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/;
  const match = transcription.match(timeRegex);
  
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    extractedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Extract services
  const extractedServices = serviceKeywords.filter(keyword => lowerText.includes(keyword));

  return {
    isBookingRequest: hasBookingIntent || hasServiceIntent,
    extractedDate,
    extractedTime,
    extractedServices,
    hasAllBookingInfo: extractedDate && extractedTime && extractedServices.length > 0
  };
}

// Process voice input and continue conversation
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio voice webhook data
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    const conversationId = formData.get('conversationId') as string;
    
    console.log('Processing voice input:', {
      from,
      to,
      callSid,
      transcription,
      confidence,
      conversationId,
    });

    // Check transcription confidence
    if (confidence < 0.5) {
      const twiml = new VoiceResponse();
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'I\'m sorry, I didn\'t quite catch that. Could you please repeat what you said?');
      
      const gather = twiml.gather({
        input: ['speech'],
        action: `/api/webhooks/twilio/voice/process?conversationId=${conversationId}&callSid=${callSid}`,
        method: 'POST',
        speechTimeout: 'auto',
        timeout: 10,
        language: 'en-US',
        enhanced: true,
        speechModel: 'phone_call'
      });

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Get conversation and detailer info
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
      throw new Error('Conversation not found');
    }

    // Store the customer's voice input
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: `[VOICE]: ${transcription}`,
        twilioSid: callSid,
        status: 'received',
      },
    });

    // Get AI response
    const aiResponse = await getVoiceAIResponse(transcription, conversation.detailer, conversation.messages);

    // Store the AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: `[VOICE RESPONSE]: ${aiResponse}`,
        status: 'sent',
      },
    });

    // Check if this is a booking request
    const bookingInfo = extractBookingInfo(transcription, conversation.messages);
    
    if (bookingInfo.isBookingRequest && bookingInfo.hasAllBookingInfo) {
      // Create a booking
      try {
        const booking = await prisma.booking.create({
          data: {
            detailerId: conversation.detailerId,
            conversationId: conversation.id,
            customerPhone: conversation.customerPhone,
            scheduledDate: new Date(bookingInfo.extractedDate!),
            scheduledTime: bookingInfo.extractedTime,
            services: bookingInfo.extractedServices,
            status: 'pending',
            notes: `AI booking request from voice call`
          }
        });

        console.log('Booking created from voice call:', booking.id);
        
        // Update AI response to include booking confirmation
        const confirmationMessage = `${aiResponse} I've created a booking for ${bookingInfo.extractedDate} at ${bookingInfo.extractedTime} for ${bookingInfo.extractedServices.join(', ')}. Is this correct?`;
        
        const twiml = new VoiceResponse();
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US',
        speechRate: 'medium'
      }, textToSpeech(confirmationMessage));

        // Ask for confirmation
        const gather = twiml.gather({
          input: ['speech'],
          action: `/api/webhooks/twilio/voice/confirm?conversationId=${conversationId}&bookingId=${booking.id}&callSid=${callSid}`,
          method: 'POST',
          speechTimeout: 'auto',
          timeout: 10,
          language: 'en-US',
          enhanced: true,
          speechModel: 'phone_call'
        });

        gather.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, 'Please say yes to confirm or no to make changes.');

        // Fallback
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, 'I didn\'t hear a response. Please call back to confirm your appointment.');
        twiml.hangup();

        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' },
        });

      } catch (error) {
        console.error('Error creating booking from voice:', error);
      }
    }

    // Continue conversation
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US',
      speechRate: 'medium'
    }, textToSpeech(aiResponse));

    // Gather next input
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice/process?conversationId=${conversationId}&callSid=${callSid}`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    gather.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'How else can I help you today?');

    // Fallback if no response
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Thank you for calling. Have a great day!');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Voice processing error:', error);
    
    // Return error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I apologize, but I\'m experiencing technical difficulties. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
