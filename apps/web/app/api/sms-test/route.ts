import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  try {
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    const from = params.get('From') || 'unknown'
    const to = params.get('To') || 'unknown'
    const body = params.get('Body') || ''

    console.log(`SMS Test - Received from ${from} to ${to}: ${body}`)

    return NextResponse.json({ 
      ok: true, 
      message: 'SMS test received',
      from,
      to,
      body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('SMS test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
