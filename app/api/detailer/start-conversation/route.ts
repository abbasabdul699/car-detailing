import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
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

    // Get detailer info first
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

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        detailerId: session.user.id,
        customerPhone: e164Phone
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    let conversation;
    
    if (existingConversation) {
      // If conversation exists but has no messages, we can re-initialize it
      if (existingConversation._count.messages === 0) {
        console.log('Re-initializing empty conversation:', existingConversation.id);
        // Update the existing conversation
        conversation = await prisma.conversation.update({
          where: { id: existingConversation.id },
          data: {
            customerName: customerName || existingConversation.customerName || null,
            status: 'active',
            lastMessageAt: new Date(),
            metadata: {
              ...(typeof existingConversation.metadata === 'object' && existingConversation.metadata !== null
                ? existingConversation.metadata
                : {}),
              aiEnabled: false
            }
          }
        });
      } else {
        // Conversation exists and has messages - return error
        return NextResponse.json({ 
          error: 'Conversation already exists with this customer',
          conversation: existingConversation
        }, { status: 409 });
      }
    } else {
      // Create new conversation
      console.log('Creating new conversation for detailer:', detailer.id, 'customer:', e164Phone);
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: e164Phone,
          customerName: customerName || null,
          status: 'active',
          metadata: {
            aiEnabled: false
          }
        }
      });
      console.log('Conversation created successfully:', conversation.id);
    }

    // Do not send an initial AI message when AI is disabled by default

    // Send vCard to new customer (atomic transaction)
    try {
      const shouldSendVcard = await prisma.$transaction(async (tx) => {
        // Check if snapshot exists
        const existingSnap = await tx.customerSnapshot.findUnique({
          where: { detailerId_customerPhone: { detailerId: detailer.id, customerPhone: e164Phone } }
        })
        
        if (!existingSnap) {
          // New customer - create snapshot and send vCard
          await tx.customerSnapshot.create({
            data: { detailerId: detailer.id, customerPhone: e164Phone, vcardSent: true }
          })
          return true // Send vCard for new customer
        }
        
        if (!existingSnap.vcardSent) {
          // Existing customer who hasn't received vCard yet
          await tx.customerSnapshot.update({
            where: { detailerId_customerPhone: { detailerId: detailer.id, customerPhone: e164Phone } },
            data: { vcardSent: true }
          })
          return true // Send vCard
        }
        
        return false // Already sent vCard
      })

      if (shouldSendVcard) {
        const vcardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/vcard?detailerId=${detailer.id}`
        try {
          console.log('📇 Sending MMS vCard via start-conversation to:', e164Phone, 'URL:', vcardUrl)
          await client.messages.create({ 
            to: e164Phone, 
            from: detailer.twilioPhoneNumber, 
            body: `Save our contact! 📇`, 
            mediaUrl: [vcardUrl] 
          })
        } catch (mmsError) {
          console.error('MMS failed, falling back to SMS:', mmsError)
          await client.messages.create({ 
            to: e164Phone, 
            from: detailer.twilioPhoneNumber, 
            body: `Save our contact: ${vcardUrl}` 
          })
        }
      }
    } catch (vcErr) {
      console.error('vCard send-once flow failed in start-conversation:', vcErr)
    }

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
          phone: e164Phone
        }
      });

      // Also create customer snapshot so SMS system recognizes them as returning customer
      await prisma.customerSnapshot.upsert({
        where: {
          detailerId_customerPhone: {
            detailerId: detailer.id,
            customerPhone: e164Phone
          }
        },
        update: {
          customerName: customerName
        },
        create: {
          detailerId: detailer.id,
          customerPhone: e164Phone,
          customerName: customerName
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
      { error: `Failed to start conversation: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
