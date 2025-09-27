import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { detailerId, phoneNumber, consentTerms, consentPrivacy } = await request.json();

    // Validate required fields
    if (!detailerId || !phoneNumber || !consentTerms || !consentPrivacy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Ensure phone number has country code
    const formattedPhone = cleanPhone.startsWith('+1') ? cleanPhone : `+1${cleanPhone}`;

    // Get detailer information
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        id: true,
        businessName: true,
        firstName: true,
        phone: true,
        twilioPhoneNumber: true,
        businessHours: true,
        smsEnabled: true,
      },
    });

    if (!detailer) {
      return NextResponse.json(
        { error: 'Detailer not found' },
        { status: 404 }
      );
    }

    if (!detailer.smsEnabled || !detailer.twilioPhoneNumber) {
      return NextResponse.json(
        { error: 'SMS service not available for this detailer' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        detailerId: detailer.id,
        customerPhone: formattedPhone,
      },
    });

    // If conversation doesn't exist, create it
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: formattedPhone,
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Create initial greeting message
    const greetingMessage = `Hi! I'm ${detailer.firstName || 'Arian'} from ${detailer.businessName}. Thanks for your interest in our car detailing services! 

I'll need to send you appointment confirmations and updates via SMS. Is that okay with you?

Reply YES to continue or STOP to opt out.`;

    // Send SMS using Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    
    const message = await client.messages.create({
      body: greetingMessage,
      from: detailer.twilioPhoneNumber,
      to: formattedPhone,
    });

    // Save the message to database
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: greetingMessage,
        twilioSid: message.sid,
        status: 'sent',
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'active',
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('Contact initiated successfully:', {
      detailerId: detailer.id,
      customerPhone: formattedPhone,
      messageSid: message.sid,
    });

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      conversationId: conversation.id,
    });

  } catch (error) {
    console.error('Error initiating contact:', error);
    
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
