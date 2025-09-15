import { NextRequest, NextResponse } from 'next/server'
import * as Twilio from 'twilio'

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

export async function GET() {
  return NextResponse.json({ message: 'Test endpoint working!' })
}

export async function POST(req: NextRequest) {
  let from = ''
  let to = ''
  
  try {
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    from = params.get('From') || ''
    to = params.get('To') || ''
    const body = params.get('Body') || ''

    console.log(`📱 Received SMS from ${from} to ${to}: ${body}`)

    // If this looks like a Twilio SMS webhook, send a reply
    if (from && to && body) {
      const aiResponse = `Hi! Thanks for your message: "${body}". This is ReevaCar AI responding. How can I help you book a car detailing service today?`

      // Send SMS response
      await twilio.messages.create({
        to: from,
        from: to,
        body: aiResponse
      })

      console.log(`Sent response to ${from}: ${aiResponse}`)

      return NextResponse.json({ 
        message: 'SMS received and replied',
        from,
        to,
        body,
        timestamp: new Date().toISOString()
      })
    }

    // Regular POST request (not SMS)
    return NextResponse.json({ 
      message: 'POST endpoint is working!',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error:', error)
    
    // Attempt to send an error message back if this was an SMS
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

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
