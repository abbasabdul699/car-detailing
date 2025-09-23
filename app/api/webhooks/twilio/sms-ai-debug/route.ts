import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

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
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    };
    
    console.log('Environment variables:', envCheck);
    
    // Test database connection
    try {
      const detailer = await prisma.detailer.findFirst({
        where: {
          twilioPhoneNumber: to,
          smsEnabled: true,
        },
      });
      
      console.log('Database connection: OK');
      console.log('Detailer found:', detailer ? 'YES' : 'NO');
      
      if (!detailer) {
        return NextResponse.json({
          success: false,
          error: 'Detailer not found',
          envCheck,
          incomingData: { from, to, body, messageSid }
        });
      }
      
      // Test Twilio client
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('Twilio client: OK');
        
        // Test OpenAI API
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: 'You are a helpful AI assistant.' },
                { role: 'user', content: 'Hello, test message' }
              ],
              max_tokens: 50,
              temperature: 0.7,
            }),
          });
          
          if (response.ok) {
            console.log('OpenAI API: OK');
          } else {
            console.log('OpenAI API: ERROR', response.status);
          }
        } catch (error) {
          console.log('OpenAI API: ERROR', error);
        }
        
      } catch (error) {
        console.log('Twilio client: ERROR', error);
      }
      
    } catch (error) {
      console.log('Database connection: ERROR', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug webhook completed',
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
