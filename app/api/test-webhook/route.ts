import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    
    console.log('Test POST received:', { from, to, body })
    
    // Test database connection
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      received: { from, to, body },
      detailer: detailer ? {
        id: detailer.id,
        businessName: detailer.businessName
      } : null
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
