import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper function to get AI response for voice
async function getVoiceAIResponse(transcription: string, detailerInfo: any, conversationHistory: any[] = []) {
  try {
    const systemPrompt = `You're answering the phone for ${detailerInfo.businessName}, a car detailing business in ${detailerInfo.city}, ${detailerInfo.state}. 

Available services: ${detailerInfo.services?.map((s: any) => s.service?.name).join(', ') || 'Various car detailing services'}

You're having a casual phone conversation with a customer. Sound like a real person who's genuinely helpful and friendly. 

IMPORTANT CONVERSATION STYLE:
- Talk like you're chatting with a friend, not giving a business presentation
- Use natural speech patterns: "Oh great!", "Sure thing!", "Perfect!", "No worries!"
- Ask follow-up questions naturally: "What kind of car do you have?", "When were you thinking?"
- Show enthusiasm: "Awesome!", "That sounds great!", "Perfect timing!"
- Use conversational fillers: "Um", "Let me see", "Actually", "Well"
- Respond to what they say: "Oh really?", "That's cool!", "Nice!"
- Be encouraging: "You got it!", "Absolutely!", "For sure!"

When booking appointments, just have a natural conversation and collect:
- Their name and phone number
- What kind of car they have
- When they want the service
- What they need done
- Where their car is

Don't sound like you're following a script. Just be a helpful, friendly person having a conversation.`;

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

// Helper function to generate speech using ElevenLabs TTS
async function generateElevenLabsSpeech(text: string, voice: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return null;
    }

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

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return `data:audio/mpeg;base64,${base64Audio}`;
    } else {
      console.error('ElevenLabs TTS error:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
}

// Helper function to generate speech using OpenAI TTS
async function generateOpenAISpeech(text: string, voice: string = 'nova'): Promise<string | null> {
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
    
    // Initial greeting - completely natural and conversational
    const greeting = `Hey! Thanks for calling ${detailer.businessName}. How can I help you today?`;
    
    // Generate speech for greeting - try ElevenLabs first, then OpenAI, then fallback to Twilio
    let greetingAudio = await generateElevenLabsSpeech(greeting);
    if (!greetingAudio) {
      greetingAudio = await generateOpenAISpeech(greeting, 'nova');
    }
    
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

    // Generate prompt audio - try ElevenLabs first, then OpenAI, then fallback to Twilio
    let promptAudio = await generateElevenLabsSpeech('What do you need help with?');
    if (!promptAudio) {
      promptAudio = await generateOpenAISpeech('What do you need help with?', 'nova');
    }
    
    if (promptAudio) {
      gather.play(promptAudio);
    } else {
      gather.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Please tell me what you need, or if you would like to book an appointment.');
    }

    // Fallback if no speech detected - try ElevenLabs first, then OpenAI, then fallback to Twilio
    let fallbackAudio = await generateElevenLabsSpeech('I didn\'t hear anything. Please try calling back and let me know how I can help you.');
    if (!fallbackAudio) {
      fallbackAudio = await generateOpenAISpeech('I didn\'t hear anything. Please try calling back and let me know how I can help you.', 'nova');
    }
    
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
    const errorAudio = await generateOpenAISpeech('I apologize, but I\'m experiencing technical difficulties. Please try calling back later.', 'nova');
    
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
