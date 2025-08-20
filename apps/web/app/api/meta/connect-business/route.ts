import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { businessId, metaBusinessId, metaPageId, metaAdAccountId } = await request.json()
    
    if (!businessId || !metaBusinessId || !metaPageId || !metaAdAccountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('🔗 Connecting Meta business:', { businessId, metaBusinessId, metaPageId, metaAdAccountId })

    // Update the business with Meta connection details
    await prisma.business.update({
      where: { id: businessId },
      data: {
        metaBusinessId,
        metaPageId,
        metaAdAccountId,
        // Keep the access token we got from OAuth
      }
    })

    console.log('✅ Successfully connected Meta business for:', businessId)

    // TODO: Set up webhook for this business's lead forms
    // await setupMetaWebhook(metaPageId, metaAdAccountId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Meta connection error:', error)
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
  }
}
