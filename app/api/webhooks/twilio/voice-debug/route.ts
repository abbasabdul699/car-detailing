import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Debug webhook - minimal functionality
export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG VOICE WEBHOOK START ===');
    
    // Create a very simple TwiML response
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Hello! This is a debug test. Can you hear me?');
    
    twiml.hangup();
    
    console.log('Debug Voice - TwiML generated:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== DEBUG VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Debug error occurred.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// Also add a GET method for testing
export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG VOICE WEBHOOK GET ===');
    
    return new NextResponse(JSON.stringify({
      message: 'Debug voice webhook is working',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('=== DEBUG VOICE WEBHOOK GET ERROR ===');
    console.error('Error details:', error);
    
    return new NextResponse(JSON.stringify({
      error: 'Debug webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}