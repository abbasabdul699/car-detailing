import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import twilio from 'twilio';

// --- BEGIN STRONG SNAPSHOT EXTRACTOR + SAFE UPSERT ---
// A lightweight list of common car makes. Extend as needed.
const KNOWN_MAKES = new Set([
  'acura','alfa romeo','aston martin','audi','bentley','bmw','buick','cadillac','chevrolet','chevy','chrysler',
  'citroen','dodge','ferrari','fiat','ford','gmc','genesis','honda','hyundai','infiniti','jaguar','jeep','kia',
  'lamborghini','land rover','lexus','lincoln','lotus','maserati','mazda','mclaren','mercedes','mercedes-benz',
  'mini','mitsubishi','nissan','peugeot','porsche','ram','renault','rolls-royce','saab','subaru','suzuki','tesla',
  'toyota','volkswagen','vw','volvo','rivian','lucid','polestar','smart','hummer','scion'
])

const STOPWORDS = new Set([
  'available','availability','today','tomorrow','monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  'morning','afternoon','evening','tonight','am','pm','this','next','then','okay','ok','sure'
])

function clean(s?: string | null) {
  return (s ?? '').trim().replace(/\s+/g, ' ')
}

function pickName(text: string) {
  const t = text.toLowerCase()
  let m = t.match(/\bmy name is\s+([a-z][a-z .'’-]{1,50})\b/i)
  if (!m) m = t.match(/\b(?:i am|i'm)\s+([a-z][a-z .'’-]{1,50})\b/i)
  if (m) {
    const candidate = clean(m[1])
    const tokens = candidate.toLowerCase().split(/\s+/)
    if (tokens.length <= 4 && !tokens.some(w => STOPWORDS.has(w))) return candidate.replace(/\b[a-z]/g, c => c.toUpperCase())
  }
  const trimmed = clean(text)
  if (/^[a-z .'-]{2,50}$/i.test(trimmed)) {
    const tokens = trimmed.split(/\s+/)
    const okLen = tokens.length >= 1 && tokens.length <= 3
    const noStop = !tokens.some(w => STOPWORDS.has(w.toLowerCase()))
    if (okLen && noStop) return trimmed.replace(/\b[a-z]/g, c => c.toUpperCase())
  }
  return undefined
}

function pickAddress(text: string) {
  const t = text.replace(/\s+in\s+/gi, ' ')
  const rx = /\b(\d{3,6})\s+([A-Za-z0-9.'’-]+(?:\s+[A-Za-z0-9.'’-]+)*?)\s+(Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Terr|Terrace|Pl|Place|Cir|Circle|Hwy|Highway)\b\.?\s*,?\s*([A-Za-z .'-]{2,30})\s*,?\s*([A-Z]{2})\s*,?\s*(\d{5}(?:-\d{4})?)?/i
  const m = t.match(rx)
  if (!m) return undefined
  const num = m[1]
  const streetName = `${m[2]} ${m[3]}`
  const city = m[4]
  const state = m[5]
  const zip = m[6]
  const line = [num, streetName.replace(/\b[a-z]/g, c => c.toUpperCase()), city?.replace(/\b[a-z]/g, c => c.toUpperCase()), state?.toUpperCase(), zip].filter(Boolean).join(', ')
  return line
}

function normalizeMake(s: string) {
  const low = s.toLowerCase()
  if (low === 'vw') return 'Volkswagen'
  if (low === 'chevy') return 'Chevrolet'
  if (low === 'mercedes' || low === 'mercedes-benz') return 'Mercedes-Benz'
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function pickVehicle(text: string) {
  const t = text.replace(/\s+/g, ' ')
  const yearRx = /\b(19[8-9]\d|20[0-4]\d|2050)\b/
  const yearM = t.match(yearRx)
  const tokens = t.toLowerCase().split(/[^a-z0-9\-]+/)

  let makeIdx = -1
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    const two = `${w} ${tokens[i+1] ?? ''}`.trim()
    if (KNOWN_MAKES.has(two) || KNOWN_MAKES.has(w)) { makeIdx = i; break }
  }
  if (makeIdx === -1 && !yearM) return undefined

  let year: number | undefined
  if (yearM) {
    const y = parseInt(yearM[1], 10)
    if (y >= 1980 && y <= 2050) year = y
  }

  let make: string | undefined
  let model: string | undefined

  if (makeIdx >= 0) {
    const maybeTwo = `${tokens[makeIdx]} ${tokens[makeIdx+1] ?? ''}`.trim()
    if (KNOWN_MAKES.has(maybeTwo)) {
      make = normalizeMake(maybeTwo)
      model = tokens[makeIdx+2]
    } else if (KNOWN_MAKES.has(tokens[makeIdx])) {
      make = normalizeMake(tokens[makeIdx])
      model = tokens[makeIdx+1]
    }
    if (model) {
      model = model.toUpperCase().length <= 10 ? model.toUpperCase() : model.slice(0, 10).toUpperCase()
      if (!/^[a-z0-9\-]+$/i.test(model)) model = undefined
    }
  }

  if (make && (model || year)) {
    return { vehicleYear: year, vehicleMake: make, vehicleModel: model, vehicle: [year, make, model].filter(Boolean).join(' ') }
  }
  return undefined
}

function pickServices(text: string, available: string[]) {
  const low = text.toLowerCase()
  const hits = new Set<string>()
  for (const s of available) {
    const kw = s.toLowerCase()
    if (kw.length < 3) continue
    if (low.includes(kw)) hits.add(s)
  }
  return Array.from(hits).slice(0, 8)
}

export function extractSnapshotHintsSafe(message: string, availableServices: string[]) {
  const text = clean(message)
  const out: any = {}

  const name = pickName(text)
  if (name) out.customerName = name

  const addr = pickAddress(text)
  if (addr) out.address = addr

  const veh = pickVehicle(text)
  if (veh) Object.assign(out, veh)

  const services = pickServices(text, availableServices)
  if (services.length) out.services = services

  // preferred date/time to keep availability words out of name/address
  const lower = text.toLowerCase()
  // date words or explicit formats
  const wd = /(this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.exec(lower)
  if (/\btoday\b/.test(lower)) out.preferredDate = 'today'
  else if (/\btomorrow\b/.test(lower)) out.preferredDate = 'tomorrow'
  else if (wd) out.preferredDate = `${wd[1] ? wd[1] + ' ' : ''}${wd[2]}`.trim()
  else {
    const mdy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/)
    if (mdy) out.preferredDate = mdy[0]
    const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
    if (!out.preferredDate && iso) out.preferredDate = iso[0]
  }

  const single = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (single) {
    const h = single[1]
    const m = single[2] ? single[2] : '00'
    out.preferredTime = `${h}:${m} ${single[3].toUpperCase()}`
  } else {
    const window = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
    if (window) {
      const sp = (window[3] || window[6]).toUpperCase()
      const sH = window[1], sM = window[2] ? window[2] : '00'
      const eH = window[4], eM = window[5] ? window[5] : '00'
      out.preferredTime = `${sH}:${sM} ${sp} - ${eH}:${eM} ${window[6].toUpperCase()}`
    } else if (/morning/i.test(text)) out.preferredTime = 'morning'
    else if (/afternoon/i.test(text)) out.preferredTime = 'afternoon'
    else if (/(evening|tonight|night)/i.test(text)) out.preferredTime = 'evening'
  }

  return out
}

// Only write new, valid fields; never overwrite existing non-empty values.
export async function safeUpsertSnapshot(detailerId: string, phone: string, incoming: any) {
  const snap = await getCustomerSnapshot(detailerId, phone).catch(() => null)
  const out: any = {}

  function canSet(key: string, val: any) {
    if (val === undefined || val === null) return false
    const existing = (snap as any)?.[key]
    if (existing === undefined || existing === null) return true
    if (typeof existing === 'string' && existing.trim() === '') return true
    if (typeof existing === 'string' && typeof val === 'string' && val.length > existing.length + 2) return true
    return false
  }

  for (const k of ['customerName','address','vehicle','vehicleYear','vehicleMake','vehicleModel','services','preferredDate','preferredTime']) {
    if (canSet(k, incoming[k])) out[k] = incoming[k]
  }
  if (Object.keys(out).length) {
    await upsertCustomerSnapshot(detailerId, phone, out)
  }
  return { ...snap, ...out }
}
// --- END STRONG SNAPSHOT EXTRACTOR + SAFE UPSERT ---

// GSM vs UCS-2 length limits
function isGsm(text: string) {
  // very simple heuristic: if any char is outside basic GSM, treat as UCS-2
  return /^[\x00-\x7F€£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"\#\$%&'\(\)\*\+,\-\.\/0-9:;<=>\?@A-Z\[\\\]\^_`a-z\{\|\}~\n\r]*$/.test(text)
}

// split into nicely sized parts, breaking on sentence/word boundaries
function chunkForSms(text: string) {
  const limitSingle = isGsm(text) ? 160 : 70
  const limitConcat = isGsm(text) ? 153 : 67 // space for UDH
  if (text.length <= limitSingle) return [text]

  // soft-clean markdown bullets/asterisks
  const cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '•')

  const parts: string[] = []
  let remaining = cleaned.trim()
  while (remaining.length) {
    const limit = parts.length === 0 ? limitConcat : limitConcat
    if (remaining.length <= limit) {
      parts.push(remaining)
      break
    }
    // prefer break at end of sentence, else at last comma, else at space
    let cut = Math.max(
      remaining.lastIndexOf('. ', limit),
      remaining.lastIndexOf('! ', limit),
      remaining.lastIndexOf('? ', limit),
      remaining.lastIndexOf('\n', limit),
      remaining.lastIndexOf(', ', limit),
      remaining.lastIndexOf(' ', limit)
    )
    if (cut <= 0) cut = limit
    parts.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }

  // add (1/3) style counters
  const total = parts.length
  return parts.map((p, i) => `${p} (${i + 1}/${total})`)
}

// Safe Twilio send with error handling
async function safeSend(client: any, to: string, from: string, body: string): Promise<string | undefined> {
  try {
    const message = await client.messages.create({ to, from, body })
    return message.sid
  } catch (error) {
    console.error('Twilio send failed:', error)
    return undefined
  }
}

async function safeSendMms(client: any, to: string, from: string, body: string, mediaUrl: string[]): Promise<string | undefined> {
  try {
    const message = await client.messages.create({ to, from, body, mediaUrl })
    return message.sid
  } catch (error) {
    console.warn('Twilio MMS failed:', error)
    return undefined
  }
}

async function sendAsMmsIfLong(client: any, to: string, from: string, body: string): Promise<string | undefined> {
  const longThreshold = 320
  const forceSms = process.env.TWILIO_FORCE_SMS === '1'
  if (body.length <= longThreshold || forceSms) {
    console.log('SMS mode selected', { forceSms, length: body.length })
    // chunk for long SMS when forceSms is on
    if (forceSms && body.length > longThreshold) {
      let firstSid: string | undefined
      for (const [i, part] of chunkForSms(body).entries()) {
        const sid = await safeSend(client, to, from, part)
        if (i === 0) firstSid = sid
      }
      return firstSid
    }
    return safeSend(client, to, from, body)
  }
  // Use an existing public asset to force MMS; avoids 404s
  const mediaUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/icon.png`
  console.log('Attempting MMS send due to long message', { length: body.length })
  const mmsSid = await safeSendMms(client, to, from, body, [mediaUrl])
  if (mmsSid) return mmsSid

  // fallback to SMS chunks
  console.warn('MMS send failed, falling back to SMS chunks')
  let firstSid: string | undefined
  for (const [i, part] of chunkForSms(body).entries()) {
    const sid = await safeSend(client, to, from, part)
    if (i === 0) firstSid = sid
  }
  return firstSid
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== FAST SMS WEBHOOK START (v2) ===');
    
    const formData = await request.formData();
    const fromRaw = formData.get('From') as string;
    const toRaw = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const from = normalizeToE164(fromRaw) || fromRaw;
    const to = normalizeToE164(toRaw) || toRaw;
    
    // Idempotency: if we've already stored a message with this SID, acknowledge and return
    if (messageSid) {
      const existing = await prisma.message.findFirst({ where: { twilioSid: messageSid } }).catch(() => null)
      if (existing) {
        console.log('Duplicate webhook for MessageSid, acknowledging without reprocessing:', messageSid)
        return NextResponse.json({ success: true, deduped: true });
      }
    }
    
    console.log('Fast - Incoming message:', { from, to, body, messageSid });
    
    // Find the detailer quickly (robust match: exact E.164 OR last 10 digits)
    const last10 = to.replace(/\D/g, '').slice(-10)
    const detailer = await prisma.detailer.findFirst({
      where: {
        smsEnabled: true,
        OR: [
          { twilioPhoneNumber: to },
          { twilioPhoneNumber: { contains: last10 } },
        ],
      },
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Only get last 5 messages for faster processing
        }
      }
    });

    if (!conversation) {
      const created = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
      // Re-fetch with messages included to satisfy typing downstream
      conversation = await prisma.conversation.findUnique({
        where: { id: created.id },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 5 }
        }
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
      // Ensure we have latest messages relation
      conversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 5 }
        }
      });
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation unavailable' }, { status: 500 })
    }

    // Store incoming message
    const inbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    // Get detailer's available services from MongoDB with categories
    const detailerServices = await prisma.detailerService.findMany({
      where: { detailerId: detailer.id },
      include: { 
        service: {
          include: {
            category: true
          }
        }
      }
    })
    
    // Group services by category for better organization
    const servicesByCategory = detailerServices.reduce((acc, ds) => {
      const category = ds.service.category?.name || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(ds.service.name)
      return acc
    }, {} as Record<string, string[]>)
    
    const availableServices = Object.entries(servicesByCategory)
      .map(([category, services]) => `${category}: ${services.join(', ')}`)
      .join(' | ')

    // Nicely format services for SMS/MMS
    function renderServices(byCat: Record<string,string[]>) {
      const order = ['Interior','Exterior','Bundle','Additional','Other']
      const parts: string[] = []
      for (const key of order) {
        const list = byCat[key]
        if (list && list.length) parts.push(`${key}: ${list.join(', ')}`)
      }
      // include any leftover categories
      for (const [k,v] of Object.entries(byCat)) {
        if (!order.includes(k) && v.length) parts.push(`${k}: ${v.join(', ')}`)
      }
      const text = `Here’s what we offer — ${parts.join(' | ')}`
      // keep it readable; the sender later decides SMS vs MMS
      return text
    }

    // If the user explicitly asks for services, answer deterministically
    const asksForServices = /\b(what\s+services|services\s*\?|do\s+you\s+(offer|provide)\s+.*services?)\b/i.test((body || '').toLowerCase())

    // Check if this is a first-time customer BEFORE updating snapshot
    const existingSnapshot = await getCustomerSnapshot(detailer.id, from)
    const isFirstTimeCustomer = !existingSnapshot
    
    console.log('DEBUG: isFirstTimeCustomer:', isFirstTimeCustomer)
    console.log('DEBUG: existingSnapshot:', existingSnapshot)
    console.log('DEBUG: detailer.id:', detailer.id)
    console.log('DEBUG: from phone:', from)

    // Update snapshot with any hints from this message
    const inferred = extractSnapshotHintsSafe(body || '', detailerServices.map(ds => ds.service.name))
    await safeUpsertSnapshot(detailer.id, from, inferred)

    // Load snapshot for context
    const snapshot = await getCustomerSnapshot(detailer.id, from)

    // Check availability for today and next few days
    const today = new Date();
    const availabilityData = [];

    // TEMPORARILY DISABLED - availability endpoint has RangeError
    // for (let i = 0; i < 7; i++) {
    //   const checkDate = new Date(today);
    //   checkDate.setDate(today.getDate() + i);
    //   const dateStr = checkDate.toISOString().split('T')[0];

    //   try {
    //     const availabilityResponse = await fetch(
    //       `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/availability?detailerId=${detailer.id}&date=${dateStr}&duration=120`
    //     );
    //     if (availabilityResponse.ok) {
    //       const availability = await availabilityResponse.json();
    //       availabilityData.push(availability);
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch availability:', error);
    //   }
    // }

    // Generate conversational AI response
    const recentMessages = conversation.messages || [];
    console.log('DEBUG: Recent messages count:', recentMessages.length);
    console.log('DEBUG: Recent messages:', recentMessages.map(m => ({ direction: m.direction, content: m.content })));
    
    const conversationHistory = recentMessages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    console.log('DEBUG: Conversation history for AI:', conversationHistory);

    // Format availability data for the AI
    const availabilitySummary = 'Availability: Please ask for preferred date and time';

    console.log('DEBUG: Generating system prompt with isFirstTimeCustomer:', isFirstTimeCustomer)
    
    const systemPrompt = `You are Arian from ${detailer.businessName}, a mobile car detailing service.

IMPORTANT: Be conversational, engaging, and natural. Don't give generic responses. Respond like a real person would. Your name is Arian. Never mention being an AI assistant - you're just Arian from the business.

${isFirstTimeCustomer ? `COMPLIANCE REQUIREMENT: This is a first-time customer. You MUST start your response by asking for SMS consent before any business conversation. Say: "Hi! I'm Arian from ${detailer.businessName}. To help you book your mobile car detailing service, I'll need to send you appointment confirmations and updates via SMS. Is that okay with you?" Only proceed with booking after they agree. If they say yes, immediately send: "${detailer.businessName}: You are now opted-in to receive appointment confirmations and updates. For help, reply HELP. To opt-out, reply STOP."` : ''}

BOOKING SEQUENCE: When someone wants to book, ALWAYS start by asking "What's your name?" first, then follow the order: car details, services, address, date/time.

Business: ${detailer.businessName}
${detailer.city && detailer.state ? `Location: ${detailer.city}, ${detailer.state}` : ''}
Business Hours: ${JSON.stringify(detailer.businessHours)}
Available Services: ${availableServices || 'Various car detailing services'}

SERVICE CATEGORIZATION:
Use the categorized services to help customers find what they need:
- If they ask about "interior services" → list only Interior category services
- If they ask about "exterior services" → list only Exterior category services  
- If they ask about "bundles" → list only Bundle category services
- If they ask about "additional services" → list only Additional category services
- Don't mention categories to customers - just use them to filter and organize your responses

Known customer context (if any):
Name: ${snapshot?.customerName || 'unknown'}
Vehicle: ${snapshot?.vehicle || [snapshot?.vehicleYear, snapshot?.vehicleMake, snapshot?.vehicleModel].filter(Boolean).join(' ') || 'unknown'}
Service Address: ${snapshot?.address || 'unknown'}
Services: ${snapshot?.services?.join(', ') || 'unknown'}

REAL-TIME AVAILABILITY:
${availabilitySummary}

IMPORTANT: Use the known information above. If you already know their name, vehicle, or address, don't ask for it again. Only ask for information you don't have yet.

When customers ask about services:
- Be enthusiastic and helpful
- Ask follow-up questions
- Make it feel like a real conversation
- Don't repeat the same response

When booking, follow this order but ONLY ask for information you don't already know:
1. If you don't know their name, ask "What's your name?"
2. If you don't know their vehicle, ask about their car (make, model, year)
3. If you don't know what services they want, ask what services they're interested in
4. If you don't know their FULL address, ask for their COMPLETE address where they want the mobile service
5. If you don't know their preferred date, ask "What date would work for you?"
6. If you don't know their preferred time, ask about their preferred time

SERVICES REQUIREMENTS:
- If you already know their services (like "interior detail"), don't ask for services again
- Use the known services information to confirm what they want
- Only ask for services if you don't have this information yet
- ONLY suggest services from the "Available Services" list above
- If a customer asks about "interior services", list only Interior category services
- If a customer asks about "exterior services", list only Exterior category services
- If a customer asks for a service not in the available services, politely explain what services you actually offer
- Never suggest services that aren't in the detailer's available services list
- Use categories internally to filter and organize responses, but don't mention categories to customers

ADDRESS REQUIREMENTS:
- Always ask for the COMPLETE address (street number, street name, city, state, ZIP)
- If they only give a city like "Needham", ask "What's your full address in Needham?"
- Never accept just a city name as sufficient address information

DATE REQUIREMENTS:
- Always ask for the specific date before confirming any time
- If they say "9 PM" without a date, ask "What date would you like the 9 PM appointment?"
- Don't assume "today" or "tomorrow" - always ask for clarification

AVAILABILITY GUIDANCE:
- Use the REAL-TIME AVAILABILITY data above to suggest specific available times
- Only suggest times that are actually available according to the business hours and calendar
- If someone asks for a time outside business hours, politely explain the business hours
- If they want a time that's not available, suggest the closest available alternative
- Always confirm the exact date AND time slot before finalizing the booking

CRITICAL: Don't ask for information you already have. Use the known context above.

CRITICAL: This is a MOBILE service - we come to the customer's location. Always ask for their specific address where they want the service performed. Never assume a location or mention a specific city unless the customer has already provided their address.

IMPORTANT: This is a MOBILE service. We come to the customer's location. Never mention "our shop" or "our location" - always ask for their address where they want the service performed.

Be conversational and natural - ask one or two questions at a time, not everything at once. Make it feel like a real person having a conversation.

NEVER mention specific cities like "Boston" unless the customer has already provided their address. Always ask for their address without assuming any location.

Be conversational and natural.`;

    // Helper: ask for the next missing slot if AI call fails
    function buildNextSlotPrompt(snap: any): string {
      if (!snap?.customerName) return "What's your name?"
      if (!snap?.vehicle && !(snap?.vehicleMake || snap?.vehicleModel || snap?.vehicleYear)) return "What vehicle do you have? (make, model, year)"
      if (!snap?.services || snap?.services.length === 0) return "What services are you interested in? (e.g., interior detail, exterior wash)"
      if (!snap?.address) return "What's the complete address where you'd like the service?"
      if (!snap?.preferredDate) return "What date works for you?"
      if (!snap?.preferredTime) return "What time works for you?"
      return "Great! Anything else you'd like to add?"
    }

    // If user intent is clearly "what services", skip the LLM and send catalog
    let aiResponse = 'Hey! Thanks for reaching out! What can I help you with today?'
    if (asksForServices) {
      aiResponse = renderServices(servicesByCategory)
      console.log('INTENT: Services catalog requested. Bypassing LLM.')
    } else {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        
        const messages = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: body }
        ];
        
        console.log('DEBUG: Sending to OpenAI:', { messageCount: messages.length, lastUserMessage: body });
        
        // Use GPT-4o (most reliable and available model)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            max_tokens: 200,
            temperature: 0.9,
          }),
        });
        clearTimeout(timeout)
        if (response.ok) {
          const data = await response.json();
          console.log('DEBUG: Full OpenAI response:', JSON.stringify(data, null, 2));
          if (data.choices?.length && data.choices[0].message?.content?.trim()) {
            aiResponse = data.choices[0].message.content.trim()
            console.log('DEBUG: OpenAI response:', aiResponse);
          } else {
            console.warn('Empty AI response, using fallback. Data:', data);
            aiResponse = buildNextSlotPrompt(snapshot)
          }
        } else {
          const errText = await response.text()
          console.warn('OpenAI API non-OK:', response.status, errText)
          // Fallback to next-missing-slot prompt when API fails
          aiResponse = buildNextSlotPrompt(snapshot)
        }
      } catch (e) {
        console.warn('OpenAI call failed, using fallback:', e)
        aiResponse = buildNextSlotPrompt(snapshot)
      }
      // AI response is ready for chunked sending
    }

    console.log('AI Response:', aiResponse);

    // Check if this is a first-time customer who just agreed to SMS consent
    if (isFirstTimeCustomer && body && (body.toLowerCase().includes('yes') || body.toLowerCase().includes('okay') || body.toLowerCase().includes('sure') || body.toLowerCase().includes('ok'))) {
      console.log('First-time customer agreed to SMS consent - will send opt-in confirmation');
      // Don't send the AI response yet, we'll send the opt-in confirmation first
    }

    // --- Twilio send(s) with consent handling ---
    const sendDisabled = process.env.TWILIO_SEND_DISABLED === '1'
    const hasTwilioCreds = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN
    let twilioSid: string | undefined

    if (!sendDisabled && hasTwilioCreds) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      const text = body.toLowerCase()
      const gaveConsent = /\b(yes|okay|ok|sure|agree|consent)\b/.test(text)

      if (isFirstTimeCustomer && gaveConsent) {
        const optIn = `${detailer.businessName}: You are now opted-in to receive appointment confirmations and updates. For help, reply HELP. To opt-out, reply STOP.`
        await safeSend(client, from, to, optIn)
      }

      // Prefer MMS (single bubble) for long messages; fallback to SMS chunks
      twilioSid = await sendAsMmsIfLong(client, from, to, aiResponse)
      
      // After sending the first AI message in a conversation, send vCard once if not sent (atomic flip)
      try {
        const vcardCheck = await prisma.$transaction(async (tx) => {
          const snap = await tx.customerSnapshot.upsert({
            where: { detailerId_customerPhone: { detailerId: detailer.id, customerPhone: from } },
            update: {},
            create: { detailerId: detailer.id, customerPhone: from, vcardSent: true }
          })
          return !snap.vcardSent
        })

        if (vcardCheck) {
          const vcardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/vcard?detailerId=${detailer.id}`
          try {
            console.log('Sending MMS vCard to:', from, 'URL:', vcardUrl)
            await client.messages.create({ to: from, from: to, body: `Save our contact! 📇`, mediaUrl: [vcardUrl] })
          } catch (mmsError) {
            console.error('MMS failed, falling back to SMS:', mmsError)
            await client.messages.create({ to: from, from: to, body: `Save our contact: ${vcardUrl}` })
          }
        }
      } catch (vcErr) {
        console.error('vCard send-once flow failed:', vcErr)
      }
    }

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        twilioSid: twilioSid,
        status: twilioSid ? 'sent' : 'simulated',
      },
    });

    // Lightweight booking creation: if user message includes a clear date and time
    // and we already have key details in the snapshot (name, vehicle, address),
    // create a pending booking so it appears in the dashboard immediately.
    try {
      const hasDate = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/i.test(body || '')
      const hasTime = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.test(body || '') || /(morning|afternoon|evening|tonight|night)/i.test(body || '') || /\b\d{1,2}\s*(?:am|pm)?\s*[-–]\s*\d{1,2}\s*(?:am|pm)\b/i.test(body || '')

      const snapForBooking = await getCustomerSnapshot(detailer.id, from)
      const hasMinimumDetails = !!(snapForBooking && (snapForBooking.customerName || snapForBooking.vehicle || snapForBooking.address))

      // Helper to parse natural dates from text
      const parseDateFromText = (text: string): Date | null => {
        const lower = text.toLowerCase()
        const today = new Date()

        if (/(^|\b)today(\b|$)/i.test(lower)) return today
        if (/(^|\b)tomorrow(\b|$)/i.test(lower)) { const d = new Date(today); d.setDate(today.getDate() + 1); return d }

        const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const
        for (let i = 0; i < weekdays.length; i++) {
          const day = weekdays[i]
          const re = new RegExp(`\\b${day}\\b`, 'i')
          if (re.test(lower)) {
            const d = new Date(today)
            const current = d.getDay()
            const target = i
            let diff = target - current
            if (diff <= 0) diff += 7
            d.setDate(d.getDate() + diff)
            return d
          }
        }

        // MM/DD or M/D, with optional year
        const md = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/)
        if (md) {
          const month = parseInt(md[1], 10) - 1
          const day = parseInt(md[2], 10)
          const yearNum = md[3] ? parseInt(md[3], 10) : today.getFullYear()
          const year = yearNum < 100 ? 2000 + yearNum : yearNum
          const d = new Date(year, month, day)
          if (!isNaN(d.getTime())) return d
        }

        // ISO YYYY-MM-DD
        const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
        if (iso) {
          const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`)
          if (!isNaN(d.getTime())) return d
        }

        return null
      }

      // Helper to parse specific times, time ranges, and dayparts
      const parseTimeFromText = (text: string): { time?: string, note?: string } => {
        // Explicit HH[:MM] am/pm
        const explicit = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
        if (explicit) {
          const h = parseInt(explicit[1], 10)
          const m = explicit[2] ? parseInt(explicit[2], 10) : 0
          const p = explicit[3].toLowerCase()
          const hh = h
          const mm = m.toString().padStart(2, '0')
          return { time: `${hh}:${mm} ${p.toUpperCase()}` }
        }

        // Ranges like 2-4pm, 2pm-4pm, between 2 and 4 pm
        const range1 = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
        if (range1) {
          const startHour = parseInt(range1[1], 10)
          const startMin = range1[2] ? parseInt(range1[2], 10) : 0
          const endPeriod = range1[6].toLowerCase()
          const startPeriod = (range1[3] ? range1[3] : endPeriod).toLowerCase()
          const start = `${startHour}:${startMin.toString().padStart(2,'0')} ${startPeriod.toUpperCase()}`
          const endHour = parseInt(range1[4], 10)
          const endMin = range1[5] ? parseInt(range1[5], 10) : 0
          const end = `${endHour}:${endMin.toString().padStart(2,'0')} ${endPeriod.toUpperCase()}`
          return { time: start, note: `Requested window ${start} - ${end}` }
        }

        const between = text.match(/between\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(?:and|\-)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
        if (between) {
          const startHour = parseInt(between[1], 10)
          const startMin = between[2] ? parseInt(between[2], 10) : 0
          const endPeriod = between[6].toLowerCase()
          const startPeriod = (between[3] ? between[3] : endPeriod).toLowerCase()
          const start = `${startHour}:${startMin.toString().padStart(2,'0')} ${startPeriod.toUpperCase()}`
          const endHour = parseInt(between[4], 10)
          const endMin = between[5] ? parseInt(between[5], 10) : 0
          const end = `${endHour}:${endMin.toString().padStart(2,'0')} ${endPeriod.toUpperCase()}`
          return { time: start, note: `Requested window ${start} - ${end}` }
        }

        // Dayparts
        if (/morning/i.test(text)) return { time: '9:00 AM' }
        if (/afternoon/i.test(text)) return { time: '1:00 PM' }
        if (/evening|tonight|night/i.test(text)) return { time: '6:00 PM' }

        return {}
      }

      if (hasDate && hasTime && hasMinimumDetails) {
        const when = parseDateFromText(body) || new Date()
        const services = Array.isArray(snapForBooking?.services) ? snapForBooking?.services as string[] : []

        const parsed = parseTimeFromText(body)

        await prisma.booking.create({
          data: {
            detailerId: detailer.id,
            conversationId: conversation.id,
            customerPhone: from,
            customerName: snapForBooking?.customerName || undefined,
            vehicleType: snapForBooking?.vehicle || [snapForBooking?.vehicleYear, snapForBooking?.vehicleMake, snapForBooking?.vehicleModel].filter(Boolean).join(' ') || undefined,
            vehicleLocation: snapForBooking?.address || undefined,
            services: services.length ? services : ['Detailing'],
            scheduledDate: when,
            scheduledTime: parsed.time || undefined,
            status: 'pending',
            notes: parsed.note ? `Auto-captured from SMS conversation (fast webhook) | ${parsed.note}` : 'Auto-captured from SMS conversation (fast webhook)'
          }
        })
      }
    } catch (e) {
      console.error('Non-fatal error creating lightweight booking:', e)
    }

    console.log('=== FAST SMS WEBHOOK SUCCESS ===');
    if (twilioSid) console.log('Response sent:', twilioSid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      twilioSid: twilioSid
    });

  } catch (error) {
    console.error('=== FAST SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Fast webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
