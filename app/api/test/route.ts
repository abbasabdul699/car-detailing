import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    webhook: 'SMS webhook should be available at /api/webhooks/twilio'
  })
}

export async function POST() {
  return NextResponse.json({ 
    message: 'POST endpoint is working!',
    timestamp: new Date().toISOString()
  })
}
