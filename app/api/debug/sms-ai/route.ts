import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG SMS AI WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Debug - Incoming message:', { from, to, body, messageSid });
    
    // Check environment variables
    const envCheck = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
      TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID ? 'SET' : 'NOT SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    };
    
    console.log('Environment variables:', envCheck);
    
    return NextResponse.json({
      success: true,
      message: 'Debug webhook working',
      envCheck,
      incomingData: { from, to, body, messageSid }
    });
    
  } catch (error) {
    console.error('=== DEBUG SMS AI WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Debug webhook error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
