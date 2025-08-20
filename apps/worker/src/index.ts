import 'dotenv/config'
import { Worker } from '@reeva/core'
import { PrismaClient } from '@reeva/db'
import Twilio from 'twilio'

const prisma = new PrismaClient()
const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
const from = process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER!

new Worker('outreach', async (job) => {
  const { leadId } = job.data as { leadId: string }
  const lead = await prisma.lead.findUnique({ 
    where:{ id: leadId }, 
    include: { contact:true, business:true }
  })
  if (!lead?.contact || !lead.business) return

  // create conversation
  const convo = await prisma.conversation.create({ 
    data: { 
      businessId: lead.businessId, 
      contactId: lead.contactId!, 
      channel:'sms', 
      stage:'intro'
    }
  })
  
  await prisma.message.create({ 
    data: { 
      conversationId: convo.id, 
      role:'ai', 
      text: 'Hey! Thanks for reaching out—what vehicle & city are we working with?' 
    }
  })

  await twilio.messages.create({
    to: lead.contact.phone,
    messagingServiceSid: typeof from === 'string' && from.startsWith('MG') ? from : undefined,
    from: typeof from === 'string' && from.startsWith('MG') ? undefined : from,
    body: 'Hey! Thanks for reaching out—what vehicle & city are we working with?'
  })
})

console.log('Worker running')
