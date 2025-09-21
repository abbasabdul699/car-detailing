import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    console.log('=== MINIMAL VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Minimal - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Test 1: Basic TwiML with Twilio voice
    console.log('Minimal - Testing basic TwiML...');
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Hello! This is a minimal test. Can you hear me?');
    
    console.log('Minimal - TwiML generated successfully');
    console.log('Minimal - TwiML content:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== MINIMAL VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error in the minimal test. Please try again.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
