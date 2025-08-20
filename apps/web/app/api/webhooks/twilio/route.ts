import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { PrismaClient } from '@reeva/db'

const prisma = new PrismaClient()
const SECRET = process.env.TWILIO_WEBHOOK_AUTH_SECRET!

function verify(req: NextRequest, raw: string){
  const sig = req.headers.get('x-reeva-signature') || ''
  const mac = crypto.createHmac('sha256', SECRET).update(raw).digest('hex')
  if (sig !== mac) throw new Error('invalid signature')
}

export async function POST(req: NextRequest){
  const raw = await req.text()
  verify(req, raw)
  const params = new URLSearchParams(raw)
  const from = params.get('From')!
  const body = params.get('Body') || ''

  // look up contact + active conversation
  const contact = await prisma.contact.findUnique({ where: { phone: from } })
  if (!contact) return NextResponse.json({ ok:true })

  const convo = await prisma.conversation.findFirst({ 
    where: { contactId: contact.id }, 
    orderBy: { createdAt: 'desc' } 
  })
  
  if (convo) {
    await prisma.message.create({ 
      data: { conversationId: convo.id, role:'user', text: body } 
    })
  }

  // TODO: route to engine; here we just echo for MVP
  const reply = `Got it — ${body}. I'll fetch a quote next.`
  // enqueue next step or call Twilio send

  return NextResponse.json({ ok:true })
}
