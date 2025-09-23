import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Simple voice webhook without ElevenLabs - just to test basic functionality
export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE MAIN VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Simple Main Voice - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Simple greeting using Twilio voice only
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Hello! Thanks for calling Reeva Car. This is a simple test of our voice system. Can you hear me clearly?');
    
    // Add a pause
    twiml.pause({ length: 2 });
    
    // Ask for input
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice-simple-main/process`,
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
    }, 'How can I help you today?');
    
    // Fallback if no input
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I didn\'t hear anything. Please call back if you need assistance. Goodbye!');
    
    twiml.hangup();
    
    console.log('Simple Main Voice - TwiML generated successfully');
    console.log('Simple Main Voice - TwiML content:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== SIMPLE MAIN VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error in our voice system. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
