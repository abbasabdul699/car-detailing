import { NextRequest, NextResponse } from 'next/server'
import * as Twilio from 'twilio'

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

export async function POST(req: NextRequest){
  try {
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    const from = params.get('From') || 'unknown'
    const to = params.get('To') || 'unknown'
    const body = params.get('Body') || ''

    console.log(`📱 SMS received from ${from} to ${to}: "${body}"`)

    // Send a reply SMS
    const replyMessage = `Hello! I received your message: "${body}". This is a test reply from Reeva Car AI system.`
    
    await twilio.messages.create({
      to: from,
      from: to,
      body: replyMessage
    })

    console.log(`📤 Reply sent to ${from}: "${replyMessage}"`)

    return NextResponse.json({ 
      ok: true, 
      message: 'SMS received and reply sent',
      from,
      to,
      body,
      reply: replyMessage,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('SMS webhook error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
