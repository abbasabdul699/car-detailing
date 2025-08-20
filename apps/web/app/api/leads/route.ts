import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  try {
    const body = await req.json()
    const { contactPhone, contactName, source = 'webform', payload = {} } = body

    // For now, just return success without database operations
    // We'll integrate with the existing database later
    return NextResponse.json({ 
      ok: true, 
      leadId: 'test-lead-' + Date.now(), 
      message: "Lead created successfully! This is a test response.",
      data: {
        contactPhone,
        contactName,
        source,
        payload
      }
    })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
