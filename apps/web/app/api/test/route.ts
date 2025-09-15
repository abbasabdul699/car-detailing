import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Test endpoint working!' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    return NextResponse.json({ 
      message: 'POST received',
      body: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
