import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Simple debug version to test basic functionality
export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Debug - Incoming call:', { from, to, callSid });
    
    // Check environment variables
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasPrisma = !!process.env.DATABASE_URL;
    
    console.log('Debug - Environment variables:', {
      hasOpenAI,
      hasElevenLabs,
      hasPrisma
    });
    
    const twiml = new VoiceResponse();
    
    // Simple greeting without any external API calls
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Hello! This is a test call to debug the voice system. If you can hear this, the basic webhook is working.');
    
    twiml.hangup();
    
    console.log('Debug - Response generated successfully');
    console.log('=== DEBUG VOICE WEBHOOK END ===');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('Debug - Error in voice webhook:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error processing your call.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
