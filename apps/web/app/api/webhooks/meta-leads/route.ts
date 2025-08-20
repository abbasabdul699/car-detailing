import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Meta Lead Ads webhook verification
function verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    
    // Verify webhook signature (optional but recommended)
    const appSecret = process.env.META_APP_SECRET
    if (appSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature.replace('sha256=', ''), appSecret)
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    console.log('📱 Meta Lead Ad received:', JSON.stringify(data, null, 2))

    // Handle different webhook types
    if (data.object === 'page' && data.entry) {
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.form_id) {
            await processLeadForm(change.value)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Meta webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function processLeadForm(leadData: any) {
  try {
    console.log('🎯 Processing Meta lead:', leadData.form_id)
    
    // Extract lead information from Meta form
    const leadInfo = extractLeadInfo(leadData)
    
    // For now, use the first business (you can make this configurable later)
    const business = await prisma.business.findFirst()
    if (!business) {
      console.error('❌ No business found')
      return
    }

    // Create or find contact
    let contact = null
    if (leadInfo.phone) {
      contact = await prisma.contact.findUnique({
        where: { phone: leadInfo.phone }
      })
      
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            businessId: business.id,
            phone: leadInfo.phone,
            name: leadInfo.name || 'Unknown',
            vehicles: leadInfo.vehicleInfo || {}
          }
        })
      }
    }

    // Create lead record
    const lead = await prisma.lead.create({
      data: {
        businessId: business.id,
        contactId: contact?.id,
        source: 'meta_ads',
        payload: {
          formId: leadData.form_id,
          formName: leadData.form_name,
          adId: leadData.ad_id,
          campaignId: leadData.campaign_id,
          leadInfo,
          rawData: leadData
        },
        status: 'new'
      }
    })

    console.log('✅ Lead created:', lead.id)

    // TODO: Trigger Arian to follow up with the lead
    // This will be implemented next
    
  } catch (error) {
    console.error('❌ Error processing lead:', error)
  }
}

function extractLeadInfo(leadData: any) {
  const leadInfo: any = {
    name: '',
    phone: '',
    email: '',
    vehicleInfo: {},
    servicePreferences: [],
    additionalInfo: ''
  }

  // Meta forms can have different field names, so we need to be flexible
  if (leadData.field_data) {
    for (const field of leadData.field_data) {
      const fieldName = field.name?.toLowerCase() || ''
      const fieldValue = field.values?.[0] || ''

      // Map common field names
      if (fieldName.includes('name') || fieldName.includes('full_name')) {
        leadInfo.name = fieldValue
      } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
        leadInfo.phone = fieldValue
      } else if (fieldName.includes('email')) {
        leadInfo.email = fieldValue
      } else if (fieldName.includes('vehicle') || fieldName.includes('car')) {
        leadInfo.vehicleInfo.type = fieldValue
      } else if (fieldName.includes('service') || fieldName.includes('detail')) {
        leadInfo.servicePreferences.push(fieldValue)
      } else if (fieldName.includes('message') || fieldName.includes('notes')) {
        leadInfo.additionalInfo = fieldValue
      }
    }
  }

  return leadInfo
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verify token (you'll set this in Meta)
  const verifyToken = process.env.META_VERIFY_TOKEN
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Meta webhook verified')
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}
