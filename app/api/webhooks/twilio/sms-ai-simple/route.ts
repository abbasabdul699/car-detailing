import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE SMS AI WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Simple - Incoming message:', { from, to, body, messageSid });
    
    // Simple response without database or Twilio calls
    const response = {
      success: true,
      message: 'Simple webhook working',
      incomingData: { from, to, body, messageSid }
    };
    
    console.log('Simple - Response:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('=== SIMPLE SMS AI WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Simple webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
