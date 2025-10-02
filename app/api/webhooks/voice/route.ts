import { NextRequest, NextResponse } from 'next/server';
import { normalizeToE164 } from '@/lib/phone';

// Voice AI that uses the exact same workflow as SMS
export async function POST(request: NextRequest) {
  try {
    console.log('=== VOICE AI (SMS-STYLE) START ===');
    
    const formData = await request.formData();
    const from = normalizeToE164(formData.get('From') as string) || formData.get('From') as string;
    const to = normalizeToE164(formData.get('To') as string) || formData.get('To') as string;
    const userInput = formData.get('Digits') as string || formData.get('SpeechResult') as string || 'hello';
    const callSid = formData.get('CallSid') as string;
    
    console.log('Voice call received:', { from, to, userInput, callSid });

    // Import and use the SMS-style voice AI
    const { POST: smsStyleHandler } = await import('./sms-style/route');
    return smsStyleHandler(request);
    
  } catch (error) {
    console.error('=== VOICE AI ERROR ===');
    console.error('Error details:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error processing your call. Please try again later.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}