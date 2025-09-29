import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import { getOrCreateCustomer, extractCustomerDataFromSnapshot } from '@/lib/customer';
import { validateVehicle, normalizeModel, generateVehicleClarification } from '@/lib/vehicleValidation';
import { validateAndNormalizeState } from '@/lib/stateValidation';
import twilio from 'twilio';

// Helper function to generate .ics calendar file content
function generateICSContent(booking: any, detailer: any): string {
  const startDateTime = new Date(booking.scheduledDate);
  
  // Parse time if provided
  if (booking.scheduledTime) {
    const [time, period] = booking.scheduledTime.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    startDateTime.setHours(hour24, parseInt(minutes), 0, 0);
  } else {
    startDateTime.setHours(14, 0, 0, 0); // Default to 2 PM
  }
  
  // Calculate end time (default 2 hours)
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 2);
  
  // Format dates for ICS (YYYYMMDDTHHMMSSZ format)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const services = Array.isArray(booking.services) 
    ? booking.services.join(', ') 
    : booking.services || 'Car Detailing';
  
  const location = booking.vehicleLocation || booking.address || 'Your location';
  const customerName = booking.customerName || 'Customer';
  
  // Generate unique ID for the event
  const eventId = `${booking.id}@reevacar.com`;
  
  // Create ICS content
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Reeva Car//Mobile Detailing//EN
BEGIN:VEVENT
UID:${eventId}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:Car Detailing - ${customerName}
DESCRIPTION:Mobile car detailing appointment\\n\\nServices: ${services}\\nCustomer: ${customerName}\\nPhone: ${booking.customerPhone}\\nVehicle: ${booking.vehicleType || 'N/A'}\\nLocation: ${location}\\nDetailer: ${detailer.businessName}\\nPhone: ${detailer.phone}
LOCATION:${location}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Car detailing appointment reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

// Helper function to create a temporary .ics file URL
async function createICSFileUrl(booking: any, detailer: any): Promise<string> {
  const icsContent = generateICSContent(booking, detailer);
  
  // Create a unique filename
  const filename = `detailing-appointment-${booking.id}.ics`;
  
  // For now, we'll create a simple API endpoint to serve the .ics file
  // In production, you might want to use a file storage service like S3
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com';
  const icsUrl = `${baseUrl}/api/calendar/download/${booking.id}`;
  
  // Store the ICS content temporarily (you might want to use Redis or database for this)
  // For now, we'll pass it as a query parameter or store it in the booking record
  return icsUrl;
}

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

function normalizeCaps(s: string) {
  return s.trim().replace(/\b[a-z]/g, c => c.toUpperCase())
}

type NameHit = { name: string; confidence: number; reason: string }

const NON_NAMES = new Set([
  'home','work','office','shop','store','house','garage','driveway',
  'detail','detailing','wash','clean','cleaning','ceramic','coating','wax','polish',
  'today','tomorrow','morning','afternoon','evening','tonight','am','pm',
  'yes','no','ok','okay','sure','thanks','please','help'
])


function looksLikeVehiclePhrase(s: string) {
  const low = s.trim().toLowerCase()
  if (/^\d{2,4}\b/.test(low)) return true // starts with year
  if (/\d/.test(low)) return true         // contains any digit
  // block "a/an + make" or "a/an + model-ish"
  if (/^(a|an)\s+/.test(low)) {
    const after = low.replace(/^(a|an)\s+/, '')
    const first = after.split(/\s+/)[0]
    if (KNOWN_MAKES.has(first) || first.length >= 3) return true
  }
  // block if any token is a known make
  for (const tok of low.split(/\s+/)) if (KNOWN_MAKES.has(tok)) return true
  return false
}

function pickName(text: string): NameHit | undefined {
  if (!text) return
  console.log('DEBUG: pickName called with text:', text)
  
  const raw = text.replace(/\s+/g, ' ').trim()
  const sentences = raw.split(/(?<=[\.\!\?])\s+/)

  const explicitRx = [
    /\bmy name is\s+([a-z][a-z .'-]{1,50})(?=[\s,!.?]|$)/i,
    /\bthis is\s+([a-z][a-z .'-]{1,50})(?=[\s,!.?]|$)/i,
    /\b(?:i am|i'm)\s+([a-z][a-z .'-]{1,50})(?=[\s,!.?]|$)/i,
    /\bit['']s\s+([a-z][a-z .'-]{1,50})(?=[\s,!.?]|$)/i
  ]

  const vet = (cand: string, reason: string, conf: number): NameHit | undefined => {
    const cleaned = cand.replace(/[^a-z .'-]/gi, ' ').replace(/\s+/g, ' ').trim()
    if (!cleaned) return
    if (/\bnot\b/i.test(cleaned)) return // "not my name"
    const tokens = cleaned.split(/\s+/)
    if (tokens.length < 1 || tokens.length > 2) return
    if (tokens.some(t => NON_NAMES.has(t.toLowerCase()))) return
    if (looksLikeVehiclePhrase(cleaned)) return
    // require letters and reasonable capitalization
    if (!/[A-Za-z]/.test(cleaned)) return
    console.log('DEBUG: pickName returning:', normalizeCaps(cleaned), 'confidence:', conf, 'reason:', reason)
    return { name: normalizeCaps(cleaned), confidence: conf, reason }
  }

  // 1) explicit patterns, sentence by sentence
  for (const s of sentences) {
    if (/\bmy name is\s+not\b/i.test(s)) continue
    for (const rx of explicitRx) {
      const m = s.match(rx)
  if (m) {
        const cand = m[1].split(/[,!.?]/)[0]
        const hit = vet(cand, 'explicit', 0.95)
        if (hit) return hit
      }
    }
  }

  // 2) bare-name whole-message (e.g., "Juan Smith")
  if (/^[a-z .'-]{2,50}$/i.test(raw)) {
    const hit = vet(raw, 'bare', 0.65)
    if (hit) return hit
  }

  console.log('DEBUG: pickName returning undefined - no match found')
  return
}

function findNameFromHistory(msgs: {direction: string; content: string}[]) {
  const inbound = msgs.filter(m => m.direction === 'inbound')
  // explicit only
  for (const m of inbound) {
    const hit = pickName(m.content || '')
    if (hit && hit.reason === 'explicit' && hit.confidence >= 0.9) return hit
  }
  // then allow bare-name fallback
  for (const m of inbound) {
    const hit = pickName(m.content || '')
    if (hit && hit.confidence >= 0.65) return hit
  }
}

function pickAddress(text: string) {
  const t = text.replace(/\s+in\s+/gi, ' ')
  
  // Try multiple regex patterns to handle different address formats
  // Order matters - more specific patterns first
  
  // Pattern 1: Addresses with ZIP code (most reliable)
  let rx = /\b(\d+)\s+([A-Za-z\s]+?)\s+(Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Terr|Terrace|Pl|Place|Cir|Circle|Hwy|Highway)\b[,\s]+(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i
  let m = t.match(rx)
  
  if (!m) {
    // Pattern 2: Standard format with 2-letter state abbreviation (no ZIP)
    rx = /\b(\d+)\s+([A-Za-z\s]+?)\s+(Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Terr|Terrace|Pl|Place|Cir|Circle|Hwy|Highway)\b[,\s]+([A-Za-z\s]+?)[,\s]+([A-Z]{2})/i
    m = t.match(rx)
  }
  
  if (!m) {
    // Pattern 3: Full state names - look for known state names at the end
    const stateNames = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia']
    
    for (const stateName of stateNames) {
      const stateRegex = new RegExp(`\\b(\\d+)\\s+([A-Za-z\\s]+?)\\s+(Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Terr|Terrace|Pl|Place|Cir|Circle|Hwy|Highway)\\b[,\\s]+([A-Za-z\\s]+?)[,\\s]+(${stateName})(?:[,\\s]+(\\d{5}(?:-\\d{4})?))?`, 'i')
      m = t.match(stateRegex)
      if (m) break
    }
  }
  
  if (!m) return undefined
  
  const num = m[1]
  const streetName = `${m[2].trim()} ${m[3]}`
  const city = m[4]?.trim()
  const stateInput = m[5]?.trim()
  const zip = m[6]
  
  // Validate and normalize the state
  const stateValidation = validateAndNormalizeState(stateInput)
  
  if (!stateValidation.valid) {
    console.log('Invalid state detected:', stateInput, stateValidation.suggestion)
    return undefined // Don't extract address with invalid state
  }
  
  const state = stateValidation.normalized
  
  if (stateValidation.suggestion) {
    console.log('State correction applied:', stateValidation.suggestion)
  }
  
  const line = [num, streetName.replace(/\b[a-z]/g, c => c.toUpperCase()), city?.replace(/\b[a-z]/g, c => c.toUpperCase()), state, zip].filter(Boolean).join(', ')
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
      // Normalize model using the new validation system
      model = normalizeModel(make || '', model)
      if (!/^[a-z0-9\-]+$/i.test(model)) model = undefined
    }
  }

  if (make && (model || year)) {
    const vehicleInfo = { vehicleYear: year, vehicleMake: make, vehicleModel: model, vehicle: [year, make, model].filter(Boolean).join(' ') }
    
    // Validate the vehicle combination
    const validation = validateVehicle({ make, model, year })
    if (!validation.valid) {
      console.log('Invalid vehicle combination detected:', vehicleInfo)
      // Return the info but flag it for AI clarification
      return { ...vehicleInfo, needsClarification: true, clarificationReason: validation.suggestions?.[0] }
    }
    
    return vehicleInfo
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

  const nameHit = pickName(text)
  if (nameHit) {
    (out as any)._nameConfidence = nameHit.confidence
    if (nameHit.confidence >= 0.9) out.customerName = nameHit.name
  }

  const addr = pickAddress(text)
  if (addr) out.address = addr

  // Extract location type (home, work, other)
  const lower = text.toLowerCase()
  if (/\bhome\b/.test(lower)) out.locationType = 'home'
  else if (/\bwork\b/.test(lower) || /\boffice\b/.test(lower)) out.locationType = 'work'
  else if (/\bother\b/.test(lower)) out.locationType = 'other'

  const veh = pickVehicle(text)
  if (veh) Object.assign(out, veh)

  const services = pickServices(text, availableServices)
  if (services.length) out.services = services

  // Extract email address
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  if (emailMatch) out.customerEmail = emailMatch[0]

  // preferred date/time to keep availability words out of name/address
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
    
    // For customer names, use confidence-based logic
    if (key === 'customerName') {
      const conf = incoming._nameConfidence ?? 0
      const existingStr = typeof existing === 'string' ? existing.trim() : ''
      const looksVehicley = !!existingStr && (
        /\d/.test(existingStr) ||                                   // contains year/digits
        existingStr.toLowerCase().split(/\s+/).some(t => KNOWN_MAKES.has(t.toLowerCase())) ||
        /^(a|an)\s/i.test(existingStr)                              // "A Nissan …"
      )

      // Always allow if we clearly had a bad/vehicle-ish name before
      if (looksVehicley && typeof val === 'string' && conf >= 0.9) return true

      const isPlaceholder = existingStr.toLowerCase() === 'customer' || existingStr === ''
      if (isPlaceholder && conf >= 0.6) return true

      // Strong new signal may replace shorter old values
      if (conf >= 0.9) return true

      return false
    }
    
    if (typeof existing === 'string' && typeof val === 'string' && val.length > existing.length + 2) return true
    return false
  }

  for (const k of ['customerName','customerEmail','address','locationType','vehicle','vehicleYear','vehicleMake','vehicleModel','services','preferredDate','preferredTime']) {
    if (canSet(k, incoming[k])) out[k] = incoming[k]
  }
  if (Object.keys(out).length) {
    await upsertCustomerSnapshot(detailerId, phone, out)
  }
  
  const updatedSnap = { ...snap, ...out }
  
  // If we now have a customer name, create/update customer record
  if (updatedSnap.customerName) {
    try {
      const customerData = extractCustomerDataFromSnapshot(updatedSnap)
      await getOrCreateCustomer(detailerId, phone, customerData)
    } catch (error) {
      console.error('Error creating customer from snapshot:', error)
      // Don't fail the snapshot update if customer creation fails
    }
  }
  
  return updatedSnap
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
    const limit = parts.length === 0 ? limitSingle : limitConcat
    
    if (remaining.length <= limit) {
      parts.push(remaining)
      break
    }

    // Find the best break point within the limit
    let bestCut = 0
    
    // Check if we're about to break a URL - if so, move the break point before the URL
    const urlMatch = remaining.slice(limit - 10, limit + 50).match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      const urlStart = remaining.indexOf(urlMatch[0], limit - 10)
      if (urlStart >= 0 && urlStart < limit) {
        // Find a break point before the URL
        const beforeUrl = remaining.slice(0, urlStart).trim()
        if (beforeUrl.length > 0) {
          // Try to break at a good point before the URL
          const lastNewline = beforeUrl.lastIndexOf('\n')
          const lastSentence = beforeUrl.lastIndexOf('. ')
          const lastComma = beforeUrl.lastIndexOf(', ')
          
          if (lastNewline > 0) bestCut = lastNewline
          else if (lastSentence > 0) bestCut = lastSentence + 1
          else if (lastComma > 0) bestCut = lastComma + 1
          else bestCut = beforeUrl.lastIndexOf(' ') || beforeUrl.length
        }
      }
    }
    
    // If we haven't found a good break point yet, continue with normal logic
    if (bestCut === 0) {
      // First, try to break at sentence endings (with or without space after)
      const sentenceEndings = ['.', '!', '?']
      for (const ending of sentenceEndings) {
        // Look for sentence ending with space after
        const cutWithSpace = remaining.lastIndexOf(ending + ' ', limit)
        if (cutWithSpace > bestCut) {
          bestCut = cutWithSpace + 1 // Include the punctuation
        }
        
        // Look for sentence ending at the exact limit (no space after)
        const cutExact = remaining.lastIndexOf(ending, limit)
        if (cutExact > bestCut && cutExact === limit - 1) {
          bestCut = cutExact + 1 // Include the punctuation
        }
      }
    }
    
    // If no good sentence break, try line breaks
    if (bestCut === 0) {
      const lineBreak = remaining.lastIndexOf('\n', limit)
      if (lineBreak > bestCut) {
        bestCut = lineBreak
      }
    }
    
    // If still no good break, try comma breaks
    if (bestCut === 0) {
      const commaBreak = remaining.lastIndexOf(', ', limit)
      if (commaBreak > bestCut) {
        bestCut = commaBreak + 1 // Include the comma
      }
    }
    
    // If still no good break, try colon or semicolon
    if (bestCut === 0) {
      const colonBreak = remaining.lastIndexOf(': ', limit)
      if (colonBreak > bestCut) {
        bestCut = colonBreak + 1 // Include the colon
      }
      const semicolonBreak = remaining.lastIndexOf('; ', limit)
      if (semicolonBreak > bestCut) {
        bestCut = semicolonBreak + 1 // Include the semicolon
      }
    }
    
    // Last resort: break at word boundary
    if (bestCut === 0) {
      bestCut = remaining.lastIndexOf(' ', limit)
    }
    
    // If we still can't find a good break point, force break at limit
    if (bestCut <= 0) {
      bestCut = limit
    }
    
    parts.push(remaining.slice(0, bestCut).trim())
    remaining = remaining.slice(bestCut).trim()
  }

  // return chunks without numbering for client-facing messages
  return parts
}

// Check for appointment conflicts
async function checkAppointmentConflict(detailerId: string, scheduledDate: Date, scheduledTime: string): Promise<{ hasConflict: boolean, conflictingAppointment?: any }> {
  try {
    // Parse the scheduled time to get start and end times
    const [timeStr, period] = scheduledTime.split(' ');
    const [hours, minutes] = timeStr.split(':');
    let startHour = parseInt(hours);
    if (period === 'PM' && startHour !== 12) startHour += 12;
    if (period === 'AM' && startHour === 12) startHour = 0;
    
    const startDateTime = new Date(scheduledDate);
    startDateTime.setHours(startHour, parseInt(minutes), 0, 0);
    
    // Default duration is 2 hours
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 2);
    
    console.log('Checking for conflicts:', {
      detailerId,
      scheduledDate: scheduledDate.toISOString(),
      scheduledTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString()
    });
    
    // Find existing bookings for the same detailer on the same day
    const existingBookings = await prisma.booking.findMany({
      where: {
        detailerId: detailerId,
        scheduledDate: {
          gte: new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()),
          lt: new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate() + 1)
        },
        status: {
          not: 'cancelled'
        }
      }
    });
    
    console.log('Found existing bookings for the day:', existingBookings.length);
    
    // Check for conflicts with existing bookings
    for (const booking of existingBookings) {
      if (!booking.scheduledTime) continue;
      
      const [existingTimeStr, existingPeriod] = booking.scheduledTime.split(' ');
      const [existingHours, existingMinutes] = existingTimeStr.split(':');
      let existingStartHour = parseInt(existingHours);
      if (existingPeriod === 'PM' && existingStartHour !== 12) existingStartHour += 12;
      if (existingPeriod === 'AM' && existingStartHour === 12) existingStartHour = 0;
      
      const existingStartDateTime = new Date(booking.scheduledDate);
      existingStartDateTime.setHours(existingStartHour, parseInt(existingMinutes), 0, 0);
      
      // Default duration is 2 hours for existing bookings too
      const existingEndDateTime = new Date(existingStartDateTime);
      existingEndDateTime.setHours(existingEndDateTime.getHours() + 2);
      
      console.log('Checking against existing booking:', {
        bookingId: booking.id,
        existingStart: existingStartDateTime.toISOString(),
        existingEnd: existingEndDateTime.toISOString(),
        newStart: startDateTime.toISOString(),
        newEnd: endDateTime.toISOString()
      });
      
      // Check if there's any overlap
      const hasOverlap = (startDateTime < existingEndDateTime && endDateTime > existingStartDateTime);
      
      if (hasOverlap) {
        console.log('CONFLICT DETECTED:', {
          existingBooking: booking.id,
          existingTime: booking.scheduledTime,
          newTime: scheduledTime
        });
        
        return {
          hasConflict: true,
          conflictingAppointment: {
            id: booking.id,
            time: booking.scheduledTime,
            customer: booking.customerName
          }
        };
      }
    }
    
    console.log('No conflicts found');
    return { hasConflict: false };
    
  } catch (error) {
    console.error('Error checking appointment conflict:', error);
    // If there's an error, allow the booking to proceed
    return { hasConflict: false };
  }
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
  const startTime = Date.now();
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
          take: 20 // Get more messages to capture name from earlier in conversation
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
      // Update conversation and get messages in one operation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
      // No need to re-fetch - we already have the messages from the initial query
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
    
    // Group services by category for better organization with pricing
    const servicesByCategory = detailerServices.reduce((acc, ds) => {
      const category = ds.service.category?.name || 'Other'
      if (!acc[category]) acc[category] = []
      
      // Format service with pricing and duration if available
      const serviceAny = ds.service as any
      let serviceInfo = ds.service.name
      const details: string[] = []
      if (serviceAny?.priceRange) {
        details.push(serviceAny.priceRange)
      } else if (typeof serviceAny?.basePrice === 'number') {
        const formattedBase = Number.isInteger(serviceAny.basePrice)
          ? serviceAny.basePrice.toString()
          : serviceAny.basePrice.toFixed(2)
        details.push(`$${formattedBase}`)
      }
      if (typeof serviceAny?.duration === 'number' && serviceAny.duration > 0) {
        details.push(`${serviceAny.duration} min`)
      }
      if (details.length) {
        serviceInfo += ` (${details.join(', ')})`
      }
      
      acc[category].push(serviceInfo)
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

    // Check if this is a first-time customer - look at both snapshot and conversation history
    const existingSnapshot = await getCustomerSnapshot(detailer.id, from)
    const hasPreviousMessages = conversation && conversation.messages && conversation.messages.length > 1
    const isFirstTimeCustomer = !existingSnapshot && !hasPreviousMessages
    
    console.log('DEBUG: isFirstTimeCustomer:', isFirstTimeCustomer)
    console.log('DEBUG: existingSnapshot:', existingSnapshot)
    console.log('DEBUG: detailer.id:', detailer.id)
    console.log('DEBUG: from phone:', from)

    // Update snapshot with any hints from this message and get updated snapshot
    const inferred = extractSnapshotHintsSafe(body || '', detailerServices.map(ds => ds.service.name))
    
    // If no name was extracted from current message, try to extract from conversation history
    if (!inferred.customerName && conversation?.messages) {
      const hit = findNameFromHistory(conversation.messages)
      if (hit) {
        console.log('DEBUG: Extracted name from history:', hit.name, 'confidence:', hit.confidence)
        inferred.customerName = hit.name
        ;(inferred as any)._nameConfidence = hit.confidence
      } else {
        console.log('DEBUG: No name found in conversation history')
      }
    }
    
    console.log('DEBUG: Final inferred customer name:', inferred.customerName)
    console.log('DEBUG: All inferred data:', inferred)
    
    const snapshot = await safeUpsertSnapshot(detailer.id, from, inferred)

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
    console.log('DEBUG: Recent messages:', recentMessages.slice(0, 10).map(m => ({ direction: m.direction, content: m.content }))); // Show first 10 for debugging
    
    const conversationHistory = recentMessages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    console.log('DEBUG: Conversation history for AI:', conversationHistory);

    // Format availability data for the AI
    const availabilitySummary = 'Availability: Please ask for preferred date and time';

    // Format business hours for the AI
    const formatBusinessHours = (businessHours: any) => {
      if (!businessHours) return 'Business hours not specified';
      
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      
      let hoursText = '';
      for (let i = 0; i < dayKeys.length; i++) {
        const day = dayKeys[i];
        const dayName = dayNames[i];
        if (businessHours[day] && businessHours[day].length >= 2) {
          const open = businessHours[day][0];
          const close = businessHours[day][1];
          hoursText += `${dayName}: ${open} - ${close}\n`;
        }
      }
      
      return hoursText || 'Business hours not specified';
    };

    console.log('DEBUG: Generating system prompt with isFirstTimeCustomer:', isFirstTimeCustomer)
    
    // Build customer context for returning customers
    let customerContext = '';
    if (!isFirstTimeCustomer && existingSnapshot) {
      const hasName = existingSnapshot.customerName && existingSnapshot.customerName.trim() !== ''
      const hasAddress = existingSnapshot.address && existingSnapshot.address.trim() !== ''
      const hasVehicle = existingSnapshot.vehicle && existingSnapshot.vehicle.trim() !== ''
      const hasEmail = existingSnapshot.customerEmail && existingSnapshot.customerEmail.trim() !== ''
      
      customerContext = `\n\nRETURNING CUSTOMER - USE EXISTING INFORMATION:
${hasName ? `Name: ${existingSnapshot.customerName}` : 'Name: Not provided'}
${hasEmail ? `Email: ${existingSnapshot.customerEmail}` : 'Email: Not provided'}  
${hasVehicle ? `Vehicle: ${existingSnapshot.vehicle}` : 'Vehicle: Not provided'}
${hasAddress ? `Address: ${existingSnapshot.address}` : 'Address: Not provided'}
Location Type: ${existingSnapshot.locationType || 'Not specified'}

CRITICAL RULES FOR RETURNING CUSTOMERS:
1. DO NOT ask for information you already have above
2. ${hasName ? `Always use "${existingSnapshot.customerName}" as their name` : 'Ask for name if not provided'}
3. ${hasAddress ? `Use "${existingSnapshot.address}" as their address - DO NOT ask again` : 'Ask for address if not provided'}
4. ${hasVehicle ? `Use "${existingSnapshot.vehicle}" as their vehicle - DO NOT ask again` : 'Ask for vehicle if not provided'}
5. ${hasEmail ? `Use "${existingSnapshot.customerEmail}" for confirmations` : 'Ask for email only if needed for confirmations'}

WHEN CUSTOMER SAYS "I want to book another appointment" or similar:
- Greet them by name: "${hasName ? existingSnapshot.customerName : 'there'}"
- Use their existing information
- Only ask: "What service would you like this time? And what date works for you?"

WHEN CUSTOMER ASKS "what is my name?" or "what's my name?":
- ${hasName ? `Tell them: "Your name is ${existingSnapshot.customerName}!"` : `Say: "I don't have your name on file yet. What's your name?"`}`;
    }
    
    // Check for existing bookings to provide real-time availability info to the AI
    let availabilityInfo = '';
    try {
      const existingBookings = await prisma.booking.findMany({
        where: {
          detailerId: detailer.id,
          scheduledDate: {
            gte: new Date(),
            lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          },
          status: {
            not: 'cancelled'
          }
        },
        select: {
          scheduledDate: true,
          scheduledTime: true,
          customerName: true,
          status: true
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      });

      if (existingBookings.length > 0) {
        availabilityInfo = `\n\nEXISTING APPOINTMENTS (next 30 days):\n`;
        existingBookings.forEach(booking => {
          const date = new Date(booking.scheduledDate);
          const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          });
          availabilityInfo += `- ${dateStr} at ${booking.scheduledTime}: ${booking.customerName || 'Customer'}\n`;
        });
        availabilityInfo += `\nWhen customers request dates/times, check this list to avoid conflicts.`;
      } else {
        availabilityInfo = `\n\nCURRENT AVAILABILITY: No existing appointments in the next 30 days. All time slots are available.`;
      }
    } catch (error) {
      console.error('Error fetching existing bookings for AI context:', error);
      availabilityInfo = `\n\nCURRENT AVAILABILITY: Unable to check existing appointments. Proceed with normal booking flow.`;
    }
    
    const systemPrompt = `You are Arian from ${detailer.businessName}, a mobile car detailing service.

🎯 MISSION: Help customers book services in 6-8 messages maximum. Be efficient and direct.

⚡ EFFICIENCY RULES:
- Ask only essential questions
- Bundle related questions together  
- Skip small talk, focus on booking
- Keep responses concise for SMS

📋 OPTIMIZED BOOKING FLOW:
1. "Hi! What detailing service do you need?" (lead with detail services)
2. "What's your vehicle?" (year, make, model)
3. "Where should we meet?" (address)
4. "When works for you?" (date/time)
5. "Perfect! Here's your booking confirmation..."

🎯 SERVICE PRIORITY (based on data):
1. Detail services (most popular - lead with this)
2. Interior cleaning
3. Exterior cleaning
4. Ceramic coating
5. Full packages

💬 RESPONSE STYLE:
- Direct and helpful
- Professional but friendly
- Clear and concise
- Action-oriented

🚫 AVOID:
- Long explanations unless asked
- Multiple follow-up questions
- Complex service descriptions
- Unnecessary details

${isFirstTimeCustomer ? `COMPLIANCE REQUIREMENT: This is a first-time customer. You MUST start your response by asking for SMS consent before any business conversation. Say: "Hi! I'm Arian from ${detailer.businessName}. To help you book your mobile car detailing service, I'll need to send you appointment confirmations and updates via SMS. Is that okay with you?" Only proceed with booking after they agree. If they say yes, immediately send: "${detailer.businessName}: You are now opted-in to receive appointment confirmations and updates. For help, reply HELP. To opt-out, reply STOP."` : ''}

BOOKING SEQUENCE: 
- For NEW customers: Ask "What's your name?" first, then follow the order: car details, services, address, date/time.
- For RETURNING customers: Use their existing information from the RETURNING CUSTOMER INFORMATION section above. Only ask for NEW details (like different service or date/time). NEVER ask for information you already have.

CRITICAL: If you see "RETURNING CUSTOMER" information above, you MUST use that information. Do NOT ask for name, address, vehicle, or email if they're already provided in that section.

Business: ${detailer.businessName}
${detailer.city && detailer.state ? `Location: ${detailer.city}, ${detailer.state}` : ''}
Business Hours:
${formatBusinessHours(detailer.businessHours)}

IMPORTANT: You MUST follow the business hours exactly as specified above. Do not make up or assume different hours.${availabilityInfo}${customerContext}

Available Services: ${availableServices || 'Various car detailing services'}

PRICING AND DURATION INFORMATION:
- Services include pricing and typical duration in parentheses (e.g., "Interior Detail ($100-150, 120 min)")
- When recommending or confirming services, include both the price range and time estimate
- When customers ask about pricing, provide the price ranges from the service list above
- For multiple services, explain that pricing and duration are additive (e.g., Interior + Exterior = total cost and time)
- Always mention that final pricing depends on vehicle size and condition
- If customers ask for quotes, provide estimated ranges and time based on the services they want

PRICING RESPONSE EXAMPLES:
- "How much for interior cleaning?" → "Interior Cleaning is $60-100 (about 90 min) depending on your vehicle size and condition"
- "What does a full detail cost?" → "Full Detail is $200-300 (about 240 min), which includes both interior and exterior services"
- "How much for ceramic coating?" → "Ceramic Coating is $400-700 (about 300 min) and provides long-lasting protection"
- "Can I get a quote?" → "Sure! What services are you interested in? I can give you an estimated range and time based on your vehicle"

SERVICE CATEGORIZATION:
Use the categorized services to help customers find what they need:
- If they ask about "interior services" → list only Interior category services with pricing
- If they ask about "exterior services" → list only Exterior category services with pricing
- If they ask about "bundles" → list only Bundle category services with pricing
- If they ask about "additional services" → list only Additional category services with pricing
- Don't mention categories to customers - just use them to filter and organize your responses

Known customer context (if any):
Name: ${snapshot?.customerName || 'unknown'}
Vehicle: ${snapshot?.vehicle || [snapshot?.vehicleYear, snapshot?.vehicleMake, snapshot?.vehicleModel].filter(Boolean).join(' ') || 'unknown'}
Service Address: ${snapshot?.address || 'unknown'}
Services: ${snapshot?.services?.join(', ') || 'unknown'}

DATE FORMATTING HELP:
- Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- When confirming dates, use MM/DD/YYYY format (e.g., 10/06/2025)
- Always include the day of the week in parentheses (e.g., "10/06/2025 (Monday)")

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
5. After getting the address, ALWAYS ask "Is this your home, work, or other location?" to categorize the address
6. If you don't know their preferred date, ask "What date would work for you?"
7. If you don't know their preferred time, ask about their preferred time
8. If you don't have their email, ask "What's your email address? (Optional - for invoices and reminders)"

EMAIL REQUIREMENTS:
- Email is completely optional - don't pressure customers to provide it
- If they say "no" or "skip" or "not needed", move on without asking again
- Only ask once, and accept their decision
- Mention it's for invoices and appointment reminders to explain the value
- IMPORTANT: Always ask for email before finalizing any booking confirmation

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

VEHICLE VALIDATION:
- If you detect a potential invalid vehicle combination (like "2020 Ferrari F150"), ask for clarification: "I want to make sure I have this right - did you mean a 2020 Ford F150?"
- For unclear models, ask: "Which [Make] model specifically? (e.g., Model 3, Model S, etc.)"
- Common model variations: "M3" = "Model 3", "MS" = "Model S", "MX" = "Model X", "MY" = "Model Y"

STATE VALIDATION:
- Accept both state abbreviations (MA, CA, NY) and full names (Massachusetts, California, New York)
- Common corrections: "CALI" = "CA", "FLA" = "FL", "MASS" = "MA", "CALIF" = "CA"
- If you detect an obviously invalid state, ask for clarification: "I didn't recognize that state - could you provide the full state name or abbreviation?"
- Don't worry about minor typos - the system will handle corrections automatically

CRITICAL: This is a MOBILE service - we come to the customer's location. Always ask for their specific address where they want the service performed. Never assume a location or mention a specific city unless the customer has already provided their address.

IMPORTANT: This is a MOBILE service. We come to the customer's location. Never mention "our shop" or "our location" - always ask for their address where they want the service performed.

Be conversational and natural - ask one or two questions at a time, not everything at once. Make it feel like a real person having a conversation.

NEVER mention specific cities like "Boston" unless the customer has already provided their address. Always ask for their address without assuming any location.

BOOKING CONFIRMATION FORMAT:
When you confirm a booking, ALWAYS end your message with a detailed confirmation that includes:
- Customer's name
- Date in MM/DD/YYYY format  
- Day of the week
- Car make and model
- Complete service address

Example format: "Perfect! Here's your booking confirmation:
Name: [Customer Name]
Date: [MM/DD/YYYY] ([Day of Week])
Time: [Time]
Car: [Make Model Year]
Service: [Service Type]
Address: [Complete Address]
Looking forward to seeing you!"

Be conversational and natural.`;

    // Helper: ask for the next missing slot if AI call fails
    function buildNextSlotPrompt(snap: any): string {
      if (!snap?.customerName) return "What's your name?"
      if (!snap?.vehicle && !(snap?.vehicleMake || snap?.vehicleModel || snap?.vehicleYear)) return "What vehicle do you have? (make, model, year)"
      if (!snap?.services || snap?.services.length === 0) return "What services are you interested in? (e.g., interior detail, exterior wash)"
      if (!snap?.address) return "What's the complete address where you'd like the service?"
      if (snap?.address && !snap?.locationType) return "Is this your home, work, or other location?"
      if (!snap?.preferredDate) return "What date works for you?"
      if (!snap?.preferredTime) return "What time works for you?"
      if (!snap?.customerEmail) return "What's your email address? (Optional - for invoices and reminders)"
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
            model: 'gpt-4o-mini-2024-07-18', // Faster model for better performance
            messages,
            max_tokens: 200,
            temperature: 0.7,
          }),
        });
        clearTimeout(timeout)
        if (response.ok) {
          const data = await response.json();
          console.log('DEBUG: Full OpenAI response:', JSON.stringify(data, null, 2));
          if (data.choices?.length && data.choices[0].message?.content?.trim()) {
            aiResponse = data.choices[0].message.content.trim()
            console.log('DEBUG: OpenAI response:', aiResponse);
            
            // Remove any existing calendar links from AI response to avoid duplicates
            aiResponse = aiResponse.replace(/\n*📅 Add to calendar:.*$/gm, '');
            
            // Check if this is an actual booking confirmation (not just conversation about bookings)
            const lowerResponse = aiResponse.toLowerCase();
            const isBookingConfirmation = (lowerResponse.includes('perfect') && lowerResponse.includes('here\'s') && lowerResponse.includes('confirmation')) ||
                                         (lowerResponse.includes('booking confirmation') && lowerResponse.includes('name:') && lowerResponse.includes('date:')) ||
                                         (lowerResponse.includes('confirmed') && lowerResponse.includes('name:') && lowerResponse.includes('date:'));
            
            if (isBookingConfirmation) {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com';
              
              // Extract booking details from the current AI response instead of old snapshot
              const nameMatch = aiResponse.match(/Name:\s*([^\n]+)/);
              const dateMatch = aiResponse.match(/Date:\s*([^\n]+)/);
              const timeMatch = aiResponse.match(/Time:\s*([^\n]+)/);
              const carMatch = aiResponse.match(/Car:\s*([^\n]+)/);
              const serviceMatch = aiResponse.match(/Service:\s*([^\n]+)/);
              const addressMatch = aiResponse.match(/Address:\s*([^\n]+)/);
              
              const name = nameMatch?.[1]?.trim() || 'Customer';
              const date = dateMatch?.[1]?.trim() || 'Your scheduled date';
              const time = timeMatch?.[1]?.trim() || 'Your scheduled time';
              const car = carMatch?.[1]?.trim() || 'Your vehicle';
              const service = serviceMatch?.[1]?.trim() || 'Car Detailing';
              const address = addressMatch?.[1]?.trim() || 'Your address';
              
              // Create shorter URL with essential details only
              const params = new URLSearchParams({
                name: name,
                date: date.replace(/\s*\([^)]+\)/, ''), // Remove day of week for shorter URL
                time: time,
                car: car,
                service: service,
                address: address
              });
              
              const calendarUrl = `${baseUrl}/calendar/add?${params.toString()}`;
              
              // Add calendar link in a separate message to avoid chunking issues
              aiResponse += `\n\n📅 Calendar: ${calendarUrl}`;
              console.log('Calendar link added to AI response with details:', { name, date, time, car, service, address });
            }
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

      // Check if message contains calendar link and is too long
      const calendarLinkMatch = aiResponse.match(/📅 Calendar: (https:\/\/[^\s]+)/);
      const messageWithoutCalendar = aiResponse.replace(/\n\n📅 Calendar: https:\/\/[^\s]+/, '');
      
      if (calendarLinkMatch && messageWithoutCalendar.length > 100) {
        // Send main message first, then calendar link separately
        console.log('Sending main message and calendar link separately to avoid chunking issues');
        twilioSid = await safeSend(client, from, to, messageWithoutCalendar);
        await safeSend(client, from, to, `📅 Add to calendar: ${calendarLinkMatch[1]}`);
      } else {
        // Use SMS chunking for long messages instead of MMS
        const chunks = chunkForSms(aiResponse)
        if (chunks.length === 1) {
          // Single SMS
          twilioSid = await safeSend(client, from, to, aiResponse)
        } else {
          // Multiple SMS chunks
          console.log(`Sending ${chunks.length} SMS chunks for long message`)
          let firstSid: string | undefined
          for (const [i, chunk] of chunks.entries()) {
            const sid = await safeSend(client, from, to, chunk)
            if (i === 0) firstSid = sid
          }
          twilioSid = firstSid
        }
      }
      
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
            
            // Check if user said "next" to get the following week's day
            const hasNext = /\bnext\b/i.test(lower)
            let diff = target - current
            
            if (hasNext) {
              // "next Wednesday" means the Wednesday of next week
              if (diff <= 0) diff += 7  // Next week
              // Don't add another 7 days - "next" already means next week
            } else {
              // Regular weekday means this week or next week
              if (diff <= 0) diff += 7  // Next week
            }
            
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

      // Check if we have enough details to create a booking and replace AI response with detailed confirmation
      // Only create booking if we have email OR customer explicitly declined to provide it
      const hasEmail = snapForBooking?.customerEmail
      const emailDeclined = /\b(no|skip|not needed|don't need|not required|optional)\b/i.test(body)
      
      console.log('DEBUG: Booking creation conditions:', {
        hasDate,
        hasTime,
        hasMinimumDetails,
        asksForServices,
        hasEmail: !!hasEmail,
        emailDeclined,
        snapForBooking: snapForBooking ? {
          customerName: snapForBooking.customerName,
          vehicle: snapForBooking.vehicle,
          address: snapForBooking.address,
          customerEmail: snapForBooking.customerEmail
        } : null
      })
      
      // If we have all details except email, ask for email first
      if (hasDate && hasTime && hasMinimumDetails && !asksForServices && !hasEmail && !emailDeclined) {
        console.log('DEBUG: Asking for email - missing email but have all other details')
        aiResponse = "What's your email address? (Optional - for invoices and reminders)"
      }
      // Only create booking if we have email OR customer explicitly declined to provide it
      else if (hasDate && hasTime && hasMinimumDetails && !asksForServices && (hasEmail || emailDeclined)) {
        console.log('DEBUG: Creating booking - all conditions met')
        const when = parseDateFromText(body) || new Date()
        const services = Array.isArray(snapForBooking?.services) ? snapForBooking?.services as string[] : []
        const parsed = parseTimeFromText(body)

        // Check for appointment conflicts before creating booking
        if (parsed.time) {
          const conflictCheck = await checkAppointmentConflict(detailer.id, when, parsed.time);
          
          if (conflictCheck.hasConflict) {
            const conflictingTime = conflictCheck.conflictingAppointment?.time || 'another appointment';
            const conflictingCustomer = conflictCheck.conflictingAppointment?.customer || 'another customer';
            
            aiResponse = `I'm sorry, but that time slot is already booked. ${conflictingCustomer} has an appointment at ${conflictingTime}. 

Please choose a different time. I'm available during our business hours:
${formatBusinessHours(detailer.businessHours)}

What time would work better for you?`;
            
            console.log('Appointment conflict detected, booking blocked:', {
              requestedTime: parsed.time,
              conflictingAppointment: conflictCheck.conflictingAppointment
            });
            
            // Don't create the booking, send conflict message instead
            return new Response(aiResponse, { status: 200 });
          }
        }

        // Create the booking
        const booking = await prisma.booking.create({
          data: {
            detailerId: detailer.id,
            conversationId: conversation.id,
            customerPhone: from,
            customerName: snapForBooking?.customerName || undefined,
            customerEmail: snapForBooking?.customerEmail || undefined,
            vehicleType: snapForBooking?.vehicle || [snapForBooking?.vehicleYear, snapForBooking?.vehicleMake, snapForBooking?.vehicleModel].filter(Boolean).join(' ') || undefined,
            vehicleLocation: snapForBooking?.address || undefined,
            services: services.length ? services : ['Detailing'],
            scheduledDate: when,
            scheduledTime: parsed.time || undefined,
            status: 'pending',
            notes: parsed.note ? `Auto-captured from SMS conversation (fast webhook) | ${parsed.note}` : 'Auto-captured from SMS conversation (fast webhook)'
          }
        })

        // Create or update customer record
        if (snapForBooking?.customerName) {
          try {
            const customerData = extractCustomerDataFromSnapshot(snapForBooking)
            const customer = await getOrCreateCustomer(detailer.id, from, customerData)
            
            if (customer) {
              // Update customer with latest booking reference
              await prisma.customer.update({
                where: { id: customer.id },
                data: { 
                  lastDetailId: booking.id,
                  updatedAt: new Date()
                }
              })
              console.log('Customer record created/updated:', customer.id)
            }
          } catch (error) {
            console.error('Error creating/updating customer:', error)
            // Don't fail the booking creation if customer creation fails
          }
        }

        // Generate detailed confirmation response
        const formattedDate = when.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        })
        const dayOfWeek = when.toLocaleDateString('en-US', { weekday: 'long' })
        
        // Create calendar page URL with multiple calendar options
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com';
        const calendarUrl = `${baseUrl}/api/calendar/add/${booking.id}`;
        
        // Use customer name from snapshot, or try to extract from conversation if not available
        let customerName = snapForBooking?.customerName || 'Customer'
        if (customerName === 'Customer' && conversation?.messages) {
          const hit = findNameFromHistory(conversation.messages)
          if (hit) {
            customerName = hit.name
          }
        }
        
        aiResponse = `Perfect! Here's your booking confirmation:

Name: ${customerName}
Date: ${formattedDate} (${dayOfWeek})
Time: ${parsed.time || 'TBD'}
Car: ${snapForBooking?.vehicle || [snapForBooking?.vehicleYear, snapForBooking?.vehicleMake, snapForBooking?.vehicleModel].filter(Boolean).join(' ') || 'TBD'}
Service: ${services.length ? services.join(', ') : 'Detailing'}
Address: ${snapForBooking?.address || 'TBD'}

📅 Add to calendar: ${calendarUrl}

You're all set! If you have any questions, just let me know.`

        // Sync to Google Calendar if detailer has it connected
        if (detailer.googleCalendarConnected && detailer.syncAppointments && detailer.googleCalendarTokens && detailer.googleCalendarRefreshToken) {
          try {
            const tokens = JSON.parse(detailer.googleCalendarTokens)
            let accessToken = tokens.access_token

            // Create Google Calendar event
            const startDateTime = new Date(when)
            if (parsed.time) {
              const [hours, minutes] = parsed.time.split(':')
              const isPM = parsed.time.includes('PM')
              let hour24 = parseInt(hours)
              if (isPM && hour24 !== 12) hour24 += 12
              if (!isPM && hour24 === 12) hour24 = 0
              startDateTime.setHours(hour24, parseInt(minutes), 0, 0)
            }
            
            const endDateTime = new Date(startDateTime)
            endDateTime.setMinutes(endDateTime.getMinutes() + 120) // Default 2 hours

            const event = {
              summary: `Car Detailing - ${customerName}`,
              description: `
Services: ${services.length ? services.join(', ') : 'Detailing'}
Customer: ${customerName}
Phone: ${from}
Vehicle: ${snapForBooking?.vehicle || 'N/A'}
Location: ${snapForBooking?.address || 'N/A'}
Notes: ${parsed.note || 'Auto-captured from SMS conversation'}
              `.trim(),
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/New_York',
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'America/New_York',
              },
              location: snapForBooking?.address || undefined,
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 24 * 60 }, // 24 hours before
                  { method: 'popup', minutes: 60 }, // 1 hour before
                ],
              },
            }

            // Try to create Google Calendar event
            try {
              const response = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(event),
                }
              )

              if (response.ok) {
                const createdEvent = await response.json()
                const googleEventId = createdEvent.id
                
                // Update booking with Google Calendar event ID
                await prisma.booking.update({
                  where: { id: booking.id },
                  data: { googleEventId }
                })

                console.log('Google Calendar event created for SMS booking:', googleEventId)
              } else {
                console.error('Google Calendar event creation failed:', response.status, response.statusText)
              }
            } catch (error) {
              // If access token is expired, try to refresh it
              console.log('Access token expired, refreshing...')
              try {
                const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: detailer.googleCalendarRefreshToken,
                    grant_type: 'refresh_token',
                  }),
                })

                if (refreshResponse.ok) {
                  const newTokens = await refreshResponse.json()
                  const newAccessToken = newTokens.access_token
                  
                  // Update the stored tokens
                  const updatedTokens = {
                    ...tokens,
                    access_token: newAccessToken,
                  }
                  
                  await prisma.detailer.update({
                    where: { id: detailer.id },
                    data: {
                      googleCalendarTokens: JSON.stringify(updatedTokens),
                    },
                  })

                  // Retry creating Google Calendar event
                  const retryResponse = await fetch(
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                    {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${newAccessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(event),
                    }
                  )

                  if (retryResponse.ok) {
                    const createdEvent = await retryResponse.json()
                    const googleEventId = createdEvent.id
                    
                    await prisma.booking.update({
                      where: { id: booking.id },
                      data: { googleEventId }
                    })

                    console.log('Google Calendar event created after token refresh:', googleEventId)
                  } else {
                    console.error('Google Calendar event creation failed after token refresh:', retryResponse.status, retryResponse.statusText)
                  }
                } else {
                  console.error('Token refresh failed:', refreshResponse.status, refreshResponse.statusText)
                }
              } catch (refreshError) {
                console.error('Error refreshing Google Calendar token:', refreshError)
              }
            }
          } catch (error) {
            console.error('Failed to create Google Calendar event for SMS booking:', error)
          }
        }
      } else {
        console.log('DEBUG: Booking creation skipped - conditions not met:', {
          hasDate,
          hasTime,
          hasMinimumDetails,
          asksForServices,
          hasEmail: !!hasEmail,
          emailDeclined,
          reason: !hasDate ? 'no date detected' :
                  !hasTime ? 'no time detected' :
                  !hasMinimumDetails ? 'missing minimum details (name/vehicle/address)' :
                  asksForServices ? 'asking for services' :
                  !hasEmail && !emailDeclined ? 'missing email and not declined' :
                  'unknown'
        })
      }
    } catch (e) {
      console.error('Non-fatal error creating lightweight booking:', e)
    }

    console.log('=== FAST SMS WEBHOOK SUCCESS ===');
    if (twilioSid) console.log('Response sent:', twilioSid);
    
    // Log performance metrics
    const endTime = Date.now();
    console.log(`Webhook processing time: ${endTime - startTime}ms`);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      twilioSid: twilioSid,
      processingTimeMs: endTime - startTime
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
