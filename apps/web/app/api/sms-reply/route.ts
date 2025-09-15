import { NextRequest, NextResponse } from 'next/server'
import * as Twilio from 'twilio'

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

export async function POST(req: NextRequest){
  let from = ''
  let to = ''
  
  try {
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    from = params.get('From')!  // Customer's phone number
    to = params.get('To')!      // Detailer's Twilio phone number
    const body = params.get('Body') || ''

    console.log(`Received SMS from ${from} to ${to}: ${body}`)

    // Create a simple AI response
    const aiResponse = `Hi! Thanks for your message: "${body}". This is ReevaCar AI responding. How can I help you book a car detailing service today?`

    // Send SMS response
    await twilio.messages.create({
      to: from,
      from: to, // Use the incoming 'To' number as the 'From' number for the reply
      body: aiResponse
    })

    console.log(`Sent response to ${from}: ${aiResponse}`)

    return NextResponse.json({ ok: true, message: 'SMS received and replied' })
  } catch (error: any) {
    console.error('Twilio webhook error:', error)
    
    // Attempt to send an error message back if possible
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