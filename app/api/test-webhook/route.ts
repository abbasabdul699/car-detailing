import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import twilio from 'twilio'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('Testing webhook endpoint...')
    
    // Test database connection
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      }
    })
    
    console.log(`Found ${detailers.length} detailers`)
    
    return NextResponse.json({ 
      success: true, 
      detailers: detailers.length,
      sample: detailers.slice(0, 2)
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    const from = params.get('From')
    const to = params.get('To')
    const body = params.get('Body')
    const messageSid = params.get('MessageSid')
    
    console.log('Test POST received:', { from, to, body, messageSid })
    
    // Find the detailer by their Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true
      }
    })

    if (!detailer) {
      console.error('No detailer found for Twilio number:', to)
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 })
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
    })

    if (!conversation) {
      // Create new conversation for incoming message
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
      })
    } else {
      // Update existing conversation
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      })
    }

    // Store the incoming message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    })

    // Create AI response
    const aiResponse = `Hi! Thanks for your message: "${body}". This is ${detailer.businessName} AI responding. How can I help you book a car detailing service today?`

    // Send AI response via Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    try {
      const responseMessage = await client.messages.create({
        body: aiResponse,
        from: to,
        to: from,
      })

      // Store the outbound message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'outbound',
          content: aiResponse,
          twilioSid: responseMessage.sid,
          status: 'sent',
        },
      })

      console.log('AI response sent successfully:', responseMessage.sid)

    } catch (twilioError: any) {
      console.error('Failed to send AI response:', twilioError.message)
    }
    
    return NextResponse.json({ 
      success: true,
      received: { from, to, body, messageSid },
      detailer: {
        id: detailer.id,
        businessName: detailer.businessName
      },
      conversation: {
        id: conversation.id,
        status: conversation.status
      },
      aiResponse: aiResponse
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
