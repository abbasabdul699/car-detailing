import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import Twilio from 'twilio'

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
const SECRET = process.env.TWILIO_WEBHOOK_AUTH_SECRET!

function verify(req: NextRequest, raw: string){
  const sig = req.headers.get('x-twilio-signature') || ''
  const mac = crypto.createHmac('sha256', SECRET).update(raw).digest('hex')
  if (sig !== mac) throw new Error('invalid signature')
}

export async function POST(req: NextRequest){
  try {
    const raw = await req.text()
    verify(req, raw)
    const params = new URLSearchParams(raw)
    const from = params.get('From')!  // Customer's phone number
    const to = params.get('To')!      // Detailer's Twilio phone number
    const body = params.get('Body') || ''

    console.log(`Received SMS from ${from} to ${to}: ${body}`)

    // Find the detailer by their Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true
      }
    })

    if (!detailer) {
      console.log(`No detailer found for Twilio number: ${to}`)
      return NextResponse.json({ ok: true }) // Ignore messages to unknown numbers
    }

    console.log(`Found detailer: ${detailer.businessName} (${detailer.id})`)

    // Look up or create contact
    let contact = await prisma.contact.findUnique({ 
      where: { 
        phone: from,
        businessId: detailer.id // Associate with this detailer's business
      } 
    })
    
    if (!contact) {
      // Create new contact for unknown numbers
      contact = await prisma.contact.create({
        data: {
          phone: from,
          name: 'Unknown Customer',
          businessId: detailer.id // Associate with this detailer
        }
      })
    }

    // Find or create active conversation
    let convo = await prisma.conversation.findFirst({ 
      where: { 
        contactId: contact.id,
        businessId: detailer.id,
        status: 'active'
      }, 
      orderBy: { createdAt: 'desc' } 
    })

    if (!convo) {
      // Create new conversation
      convo = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          businessId: detailer.id, // Use detailer's ID as business ID
          channel: 'sms',
          stage: 'greeting',
          status: 'active'
        }
      })
    }

    // Save user message
    await prisma.message.create({ 
      data: { 
        conversationId: convo.id, 
        role: 'user', 
        text: body 
      } 
    })

    // Generate simple AI response (temporary)
    let aiResponse = "Hello! I'm your car detailing assistant. How can I help you today?"
    
    if (body.toLowerCase().includes('book') || body.toLowerCase().includes('schedule')) {
      aiResponse = "I'd be happy to help you book a detailing service! What type of service are you looking for?"
    } else if (body.toLowerCase().includes('price') || body.toLowerCase().includes('cost')) {
      aiResponse = "Our pricing varies by service type. Could you tell me what kind of detailing you need?"
    } else if (body.toLowerCase().includes('hello') || body.toLowerCase().includes('hi')) {
      aiResponse = "Hello! Welcome to " + detailer.businessName + ". I'm here to help you with your car detailing needs. What can I do for you today?"
    }

    // Save AI response
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        role: 'ai',
        text: aiResponse
      }
    })

    // Send SMS response using the detailer's Twilio phone number
    await twilio.messages.create({
      to: from,
      from: detailer.twilioPhoneNumber!,
      body: aiResponse
    })

    console.log(`Sent response to ${from}: ${aiResponse}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    
    // Send error message to user
    try {
      const params = new URLSearchParams(await req.text())
      const from = params.get('From')!
      
      await twilio.messages.create({
        to: from,
        from: to, // Use the detailer's phone number
        body: "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment."
      })
    } catch (sendError) {
      console.error('Failed to send error message:', sendError)
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
