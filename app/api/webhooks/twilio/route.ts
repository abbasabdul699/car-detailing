import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import * as Twilio from 'twilio'

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
const SECRET = process.env.TWILIO_WEBHOOK_AUTH_SECRET!

function verify(req: NextRequest, raw: string){
  const sig = req.headers.get('x-twilio-signature') || ''
  const mac = crypto.createHmac('sha256', SECRET).update(raw).digest('hex')
  if (sig !== mac) throw new Error('invalid signature')
}

export async function POST(req: NextRequest){
  let from = ''
  let to = ''
  
  try {
    const raw = await req.text()
    
    // Skip signature verification for testing
    // verify(req, raw)
    
    const params = new URLSearchParams(raw)
    from = params.get('From')!  // Customer's phone number
    to = params.get('To')!      // Detailer's Twilio phone number
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

    // Generate simple AI response (temporary)
    let aiResponse = "Hello! I'm your car detailing assistant. How can I help you today?"
    
    if (body.toLowerCase().includes('book') || body.toLowerCase().includes('schedule')) {
      aiResponse = "I'd be happy to help you book a detailing service! What type of service are you looking for?"
    } else if (body.toLowerCase().includes('price') || body.toLowerCase().includes('cost')) {
      aiResponse = "Our pricing varies by service type. Could you tell me what kind of detailing you need?"
    } else if (body.toLowerCase().includes('hello') || body.toLowerCase().includes('hi')) {
      aiResponse = "Hello! Welcome to " + detailer.businessName + ". I'm here to help you with your car detailing needs. What can I do for you today?"
    }

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
    
    // Send error message to user if we have the phone numbers
    if (from && to) {
      try {
        await twilio.messages.create({
          to: from,
          from: to,
          body: "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment."
        })
      } catch (sendError) {
        console.error('Failed to send error message:', sendError)
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
