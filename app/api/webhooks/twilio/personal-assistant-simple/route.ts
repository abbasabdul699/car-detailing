import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 === SIMPLE PERSONAL ASSISTANT WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const to = formData.get('To') as string;

    console.log('📱 Simple PA SMS:', { from, body, to });

    // Find detailer by Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: { twilioPhoneNumber: to },
      select: {
        id: true,
        businessName: true,
        personalPhoneNumber: true,
        twilioPhoneNumber: true
      }
    });

    if (!detailer) {
      console.log('❌ Detailer not found for Twilio number:', to);
      return new NextResponse('Detailer not found', { status: 404 });
    }

    console.log('✅ Detailer found:', detailer.businessName);
    console.log('📞 Personal phone:', detailer.personalPhoneNumber);
    console.log('📞 Twilio phone:', detailer.twilioPhoneNumber);

    // Simple response
    const response = `Hello ${detailer.businessName}! This is your Personal Assistant AI. You sent: "${body}". Your personal phone: ${detailer.personalPhoneNumber}`;

    console.log('🤖 Simple response:', response);

    return new NextResponse(response, { status: 200 });

  } catch (error) {
    console.error('❌ Simple Personal Assistant webhook error:', error);
    return new NextResponse('Simple PA webhook error', { status: 500 });
  }
}
