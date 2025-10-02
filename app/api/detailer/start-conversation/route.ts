import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerPhone, customerName } = await request.json();

    if (!customerPhone) {
      return NextResponse.json({ error: 'Customer phone number is required' }, { status: 400 });
    }

    // Normalize phone number
    const normalizedPhone = customerPhone.replace(/\D/g, '');
    const e164Phone = normalizedPhone.startsWith('1') ? `+${normalizedPhone}` : `+1${normalizedPhone}`;

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        detailerId: session.user.id,
        customerPhone: e164Phone
      }
    });

    if (existingConversation) {
      return NextResponse.json({ 
        error: 'Conversation already exists with this customer',
        conversation: existingConversation
      }, { status: 409 });
    }

    // Get detailer info
    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    if (!detailer.twilioPhoneNumber) {
      return NextResponse.json({ error: 'Detailer phone number not configured' }, { status: 400 });
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        detailerId: detailer.id,
        customerPhone: e164Phone,
        customerName: customerName || null,
        status: 'active'
      }
    });

    // Create initial AI message
    const initialMessage = `Hi${customerName ? ` ${customerName}` : ''}! 👋 

I'm ${detailer.businessName}'s AI assistant. I'm here to help you book your car detailing service! 

What type of service are you looking for today? I can help you with:
• Interior cleaning
• Exterior washing
• Full detail packages
• Or any other car care needs

Just let me know what you need! 🚗✨`;

    // Send SMS via Twilio
    try {
      await client.messages.create({
        body: initialMessage,
        from: detailer.twilioPhoneNumber,
        to: e164Phone
      });
    } catch (twilioError: any) {
      console.error('Twilio error:', twilioError);
      // Don't fail the request if SMS fails, just log it
    }

    // Save the initial message to database
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: initialMessage,
        status: 'sent'
      }
    });

    // Create customer record if name provided
    if (customerName) {
      await prisma.customer.upsert({
        where: {
          detailerId_phone: {
            detailerId: detailer.id,
            phone: e164Phone
          }
        },
        update: {
          name: customerName
        },
        create: {
          detailerId: detailer.id,
          name: customerName,
          phone: e164Phone,
          source: 'Manual Entry'
        }
      });
    }

    // Create notification for detailer
    await prisma.notification.create({
      data: {
        detailerId: detailer.id,
        message: `📱 New conversation started with ${customerName || e164Phone}`,
        type: 'new_conversation',
        link: '/detailer-dashboard/messages'
      }
    });

    return NextResponse.json({ 
      success: true,
      conversation: {
        id: conversation.id,
        customerPhone: conversation.customerPhone,
        customerName: conversation.customerName,
        status: conversation.status,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt
      }
    });

  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to start conversation' },
      { status: 500 }
    );
  }
}
