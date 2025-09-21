import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    const from = params.get('From');
    const to = params.get('To');
    const callSid = params.get('CallSid');
    const callStatus = params.get('CallStatus');
    
    console.log('Twilio Webhook Test:', {
      from,
      to,
      callSid,
      callStatus,
      body
    });
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook test error:', error);
    return new Response('Error', { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString()
  });
}
