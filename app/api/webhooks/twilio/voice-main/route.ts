import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Main voice webhook - optimized to avoid TwiML size limits
export async function POST(request: NextRequest) {
  try {
    console.log('=== MAIN VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Main Voice - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Use Twilio's built-in voice for reliability and to avoid size limits
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Hello! Thanks for calling Reeva Car. This is our AI voice assistant. How can I help you today?');
    
    // Add a pause
    twiml.pause({ length: 1 });
    
    // Gather speech input
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice-main/process`,
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
    }, 'Please tell me what you need help with today.');
    
    // Fallback if no speech is detected
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I didn\'t hear anything. Please call back if you need assistance. Thank you for calling Reeva Car.');
    
    twiml.hangup();
    
    console.log('Main Voice - TwiML generated:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== MAIN VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I\'m sorry, there was a technical issue. Please try calling again later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}