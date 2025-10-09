import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 === DEMO WEBHOOK START ===');
    
    const body = await request.formData();
    const from = body.get('From') as string;
    const to = body.get('To') as string;
    const messageBody = body.get('Body') as string;
    const messageSid = body.get('MessageSid') as string;

    console.log('Demo - Incoming message:', {
      from,
      to,
      body: messageBody,
      messageSid
    });

    // Find the detailer for this phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        OR: [
          { twilioPhoneNumber: to },
          { twilioPhoneNumber: { contains: to.replace('+1', '') } }
        ],
        smsEnabled: true
      },
      select: {
        id: true,
        businessName: true,
        firstName: true,
        twilioPhoneNumber: true
      }
    });

    if (!detailer) {
      console.log('❌ Demo: No detailer found for phone number:', to);
      return new NextResponse('Detailer not found', { status: 404 });
    }

    console.log('✅ Demo: Found detailer:', detailer.businessName);

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        detailerId: detailer.id,
        customerPhone: from
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (!conversation) {
      console.log('📝 Demo: Creating new conversation');
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date()
        }
      });
    } else {
      // Update last message time
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() }
      });
    }

    // Save the incoming message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: messageBody,
        twilioSid: messageSid,
        status: 'received'
      }
    });

    console.log('💾 Demo: Message saved to conversation:', conversation.id);

    // For demo mode, we just save the message and don't send any AI response
    // The detailer will respond manually from their dashboard
    
    console.log('🎭 === DEMO WEBHOOK SUCCESS ===');
    console.log('Demo: Message processed, waiting for manual response from dashboard');
    
    return new NextResponse('Demo message processed', { status: 200 });

  } catch (error) {
    console.error('❌ Demo webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
