import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE SMS WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    console.log('Simple - Incoming message:', { from, to, body, messageSid });
    
    // Find the detailer
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
    });

    if (!detailer) {
      console.log('No detailer found for Twilio number:', to);
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    console.log('Detailer found:', detailer.businessName);

    // Simple AI response
    const aiResponse = `Hello! Thank you for contacting ${detailer.businessName}. I'm an AI assistant here to help you book your car detailing appointment. What services are you interested in?`;

    console.log('AI Response:', aiResponse);

    // Send SMS response via Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMessage = await client.messages.create({
      to: from,
      from: to,
      body: aiResponse
    });

    console.log('Twilio message sent:', twilioMessage.sid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      twilioSid: twilioMessage.sid
    });

  } catch (error) {
    console.error('=== SIMPLE SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Simple webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
