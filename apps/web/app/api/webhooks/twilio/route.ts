import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  try {
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    const from = params.get('From') || 'unknown'
    const to = params.get('To') || 'unknown'
    const body = params.get('Body') || ''

    console.log(`Received SMS from ${from} to ${to}: ${body}`)

    // Simple response for testing
    return NextResponse.json({ 
      ok: true, 
      message: 'SMS received',
      from,
      to,
      body
    })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
