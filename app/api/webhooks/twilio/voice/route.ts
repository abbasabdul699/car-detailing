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
1. Answer the phone professionally and warmly
2. Help customers book appointments
3. Answer questions about services and pricing
4. Collect necessary details for booking (date, time, vehicle type, services needed)
5. Provide information about availability

When booking appointments:
- Ask for preferred date and time
- Ask about the vehicle (type, model, year)
- Ask what services they need
- Ask where the vehicle is located
- Confirm all details before finalizing

Be conversational, friendly, and professional. Keep responses concise but informative. Speak naturally as if you're a real person answering the phone.`;

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
    return 'I apologize, but I\'m having trouble processing your request right now. Please try calling back in a moment.';
  }
}

// Helper function to generate speech using OpenAI TTS
async function generateOpenAISpeech(text: string, voice: string = 'alloy'): Promise<string | null> {
  try {
    // Clean up the text for better speech synthesis
    let cleanText = text
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters but keep hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Simple text cleanup
    cleanText = cleanText
      .replace(/\s+/g, ' ') // Ensure single spaces
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/!{2,}/g, '!') // Replace multiple exclamations with single
      .replace(/\?{2,}/g, '?'); // Replace multiple questions with single

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd', // Higher quality voice
        input: cleanText,
        voice: voice,
        response_format: 'mp3',
        speed: 1.0
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return `data:audio/mp3;base64,${base64Audio}`;
    } else {
      console.error('OpenAI TTS error:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    return null;
  }
}

// Initial call handler - when customer first calls
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio voice webhook data
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Incoming Twilio voice call:', {
      from,
      to,
      callSid,
    });

    // Find the detailer by their Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true, // Using smsEnabled as a general "communication enabled" flag
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
      
      // Return a generic response if detailer not found
      const twiml = new VoiceResponse();
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Thank you for calling. We are currently unavailable. Please try again later or send us a text message.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Find or create conversation for this call
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
    });

    if (!conversation) {
      // Create new conversation for incoming call
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

    // Store the incoming call as a message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: '[VOICE CALL STARTED]',
        twilioSid: callSid,
        status: 'received',
      },
    });

    // Create TwiML response for initial greeting
    const twiml = new VoiceResponse();
    
    // Initial greeting
    const greeting = `Hello! Thank you for calling ${detailer.businessName}. I'm your AI assistant. How can I help you today?`;
    
    // Generate OpenAI speech for greeting
    const greetingAudio = await generateOpenAISpeech(greeting, 'alloy');
    
    if (greetingAudio) {
      twiml.play(greetingAudio);
    } else {
      // Fallback to Twilio voice
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US',
        speechRate: 'medium'
      }, greeting);
    }

    // Gather customer input with speech recognition
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice/process?conversationId=${conversation.id}&callSid=${callSid}`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Generate prompt audio
    const promptAudio = await generateOpenAISpeech('Please tell me what you need, or if you would like to book an appointment.', 'alloy');
    
    if (promptAudio) {
      gather.play(promptAudio);
    } else {
      gather.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Please tell me what you need, or if you would like to book an appointment.');
    }

    // Fallback if no speech detected
    const fallbackAudio = await generateOpenAISpeech('I didn\'t hear anything. Please try calling back and let me know how I can help you.', 'alloy');
    
    if (fallbackAudio) {
      twiml.play(fallbackAudio);
    } else {
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'I didn\'t hear anything. Please try calling back and let me know how I can help you.');
    }

    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Twilio voice webhook error:', error);
    
    // Return error response
    const twiml = new VoiceResponse();
    const errorAudio = await generateOpenAISpeech('I apologize, but I\'m experiencing technical difficulties. Please try calling back later.', 'alloy');
    
    if (errorAudio) {
      twiml.play(errorAudio);
    } else {
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'I apologize, but I\'m experiencing technical difficulties. Please try calling back later.');
    }
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
