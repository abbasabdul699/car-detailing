import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    
    // Create TwiML response for real-time conversation
    const twiml = new VoiceResponse();
    
    // Start Media Streams for real-time audio
    const stream = twiml.start();
    stream.stream({
      name: 'realtime-conversation',
      url: `wss://${request.headers.get('host')}/api/webhooks/twilio/voice/realtime/stream?callSid=${callSid}`,
      track: 'both_tracks'
    });
    
    // Initial greeting
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US',
      speechRate: 'medium'
    }, 'Hello! You\'re now connected to our real-time AI assistant. How can I help you today?');
    
    // Keep the call open for real-time conversation
    twiml.pause({ length: 60 });
    
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
    
  } catch (error) {
    console.error('Realtime voice webhook error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I apologize, but I\'m experiencing technical difficulties. Please try calling back later.');
    twiml.hangup();
    
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
