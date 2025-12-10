import { prisma } from '@/lib/prisma'

export type SnapshotUpdate = {
  customerName?: string | null
  customerEmail?: string | null
  address?: string | null
  locationType?: string | null
  vehicle?: string | null
  vehicleYear?: number | null
  vehicleMake?: string | null
  vehicleModel?: string | null
  services?: string[] | null
  vcardSent?: boolean | null
  data?: Record<string, unknown> | null
}

export async function getCustomerSnapshot(detailerId: string, customerPhone: string) {
  return prisma.customerSnapshot.findUnique({
    where: { detailerId_customerPhone: { detailerId, customerPhone } },
  })
}

export async function upsertCustomerSnapshot(
  detailerId: string,
  customerPhone: string,
  update: SnapshotUpdate,
) {
  const cleaned: Record<string, unknown> = {}
  if (update.customerName !== undefined) cleaned.customerName = update.customerName
  if (update.customerEmail !== undefined) cleaned.customerEmail = update.customerEmail
  if (update.address !== undefined) cleaned.address = update.address
  if (update.locationType !== undefined) cleaned.locationType = update.locationType
  if (update.vehicle !== undefined) cleaned.vehicle = update.vehicle
  if (update.vehicleYear !== undefined) cleaned.vehicleYear = update.vehicleYear
  if (update.vehicleMake !== undefined) cleaned.vehicleMake = update.vehicleMake
  if (update.vehicleModel !== undefined) cleaned.vehicleModel = update.vehicleModel
  if (update.services !== undefined) cleaned.services = update.services || []
  if (update.data !== undefined) cleaned.data = update.data

  return prisma.customerSnapshot.upsert({
    where: { detailerId_customerPhone: { detailerId, customerPhone } },
    update: cleaned,
    create: {
      detailerId,
      customerPhone,
      ...cleaned,
    },
  })
}

// Very lightweight heuristics to pull name/vehicle/address from plain SMS
export function extractSnapshotHints(text: string, availableServices?: string[]) {
  const result: SnapshotUpdate = {}
  const normalized = collapseWhitespace(text).trim()

  // Name patterns - improved to handle more common patterns
  const namePatterns = [
    // "My name is Sabeeh" - more flexible ending
    /\bmy name is\s+([a-zA-Z][a-zA-Z\s'-]{1,40}?)(?:\s+(?:and|at|have|want|need|looking|for|to|get|book|schedule|thanks|thank|you|please|sorry|help|stop|cancel|booking|appointment|time|date|service|interior|exterior|wash|detail|cleaning|car|vehicle|home|work|office|address|location|price|cost|money|payment)|\s*$)/i,
    // "I am Sabeeh" - more flexible ending
    /\bi am\s+([a-zA-Z][a-zA-Z\s'-]{1,40}?)(?:\s+(?:and|at|have|want|need|looking|for|to|get|book|schedule|thanks|thank|you|please|sorry|help|stop|cancel|booking|appointment|time|date|service|interior|exterior|wash|detail|cleaning|car|vehicle|home|work|office|address|location|price|cost|money|payment)|\s*$)/i,
    // "This is Sabeeh" - more flexible ending
    /\bthis is\s+([a-zA-Z][a-zA-Z\s'-]{1,40}?)(?:\s+(?:and|at|have|want|need|looking|for|to|get|book|schedule|thanks|thank|you|please|sorry|help|stop|cancel|booking|appointment|time|date|service|interior|exterior|wash|detail|cleaning|car|vehicle|home|work|office|address|location|price|cost|money|payment)|\s*$)/i,
    // "I'm Sabeeh" - more flexible ending
    /\b(?:i'm|im)\s+([a-zA-Z][a-zA-Z\s'-]{1,40}?)(?:\s+(?:and|at|have|want|need|looking|for|to|get|book|schedule|thanks|thank|you|please|sorry|help|stop|cancel|booking|appointment|time|date|service|interior|exterior|wash|detail|cleaning|car|vehicle|home|work|office|address|location|price|cost|money|payment)|\s*$)/i,
    // Handle greetings like "Hi Mom Pean!" - extract the name after greeting words
    /\b(?:hi|hello|hey|greetings)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    // "My mama is sabeeh" -> "My name is Sabeeh" correction
    /\bmy mama is\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i,
    // "No my name is Sabeeh" - correction pattern
    /\bno my name is\s+([a-zA-Z][a-zA-Z\s'-]{1,40}?)(?:\s+(?:and|at|have|want|need|looking|for|to|get|book|schedule|thanks|thank|you|please|sorry|help|stop|cancel|booking|appointment|time|date|service|interior|exterior|wash|detail|cleaning|car|vehicle|home|work|office|address|location|price|cost|money|payment)|\s*$)/i,
    // Standalone name patterns (no trigger words needed) - but exclude addresses and common greeting words
    /\b(?!hi|hello|hey|greetings|thanks|thank|please|sorry|help|stop|cancel|book|booking|appointment|schedule|time|date|service|interior|exterior|wash|detail|cleaning|car|vehicle|toyota|honda|ford|bmw|mercedes|tesla|nissan|hyundai|kia|subaru|mazda|lexus|audi|volkswagen|home|work|office|address|location|price|cost|money|payment)([A-Z][a-z]+\s+[A-Z][a-z]+)\b(?!\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle|Suite|Apt|Unit))/,
    // Handle names like "Mom Pean" - two capitalized words that aren't addresses
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b(?!\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle|Suite|Apt|Unit|MA|CA|NY|TX|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|RI|MT|DE|SD|ND|AK|VT|WY|DC))/,
  ]
  for (const p of namePatterns) {
    const m = normalized.match(p)
    if (m) { 
      const name = m[1].trim()
      // Clean up name - remove common trailing words
      const cleanName = name.replace(/\s+(and|at|have|want|need|looking|for|to|get|book|schedule).*$/i, '').trim()
      // Extra guard: avoid capturing street fragments like "Dyer St" as a name
      const parts = cleanName.split(/\s+/)
      const second = (parts[1] || '').toLowerCase()
      const streetTokens = ['st','street','ave','avenue','rd','road','dr','drive','blvd','boulevard','ln','lane','ct','court','pl','place','way','cir','circle','hwy','highway','pkwy','parkway','suite','apt','unit']
      if (streetTokens.includes(second)) {
        // Skip this match; it's likely an address fragment
        continue
      }
      result.customerName = cleanName
      break 
    }
  }

  // Vehicle: capture year (19xx/20xx), make, model with better filtering
  // Examples: "I have a 2023 Toyota RAV4", "driving a 2018 Honda Civic", "it's a Toyota Sienna 2007", "I think its a 2012 toyota Camry"
  const vehiclePatterns = [
    // Year Make Model: "2023 Toyota RAV4", "2015 Honda Civic", "2012 toyota Camry", "2020 Tesla Model 3"
    /\b(?:have|driving|drive|car is|vehicle is|it's a|its a|think its a|think it's a)\s+(?:a|an)?\s*((?:19|20)\d{2})\s+([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\s\-]{1,20})\b/i,
    // Make Model Year: "Toyota Sienna 2007", "Honda Accord 2019"
    /\b(?:have|driving|drive|car is|vehicle is|it's a|its a|think its a|think it's a)\s+(?:a|an)?\s*([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\s+((?:19|20)\d{2})\b/i,
    // Make Model only: "Toyota Camry", "Honda Civic"
    /\b(?:have|driving|drive|car is|vehicle is|it's a|its a|think its a|think it's a)\s+(?:a|an)?\s*([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\b/i,
    // Standalone vehicle patterns (no trigger words needed)
    /\b((?:19|20)\d{2})\s+([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\b/i,
    /\b([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\s+((?:19|20)\d{2})\b/i,
    // Handle "Tesla Model 3" and "2020" in separate messages
    // Make Model only, but guard against common phrases like "thank you", "you there"
    /\b(?!thank\b|you\b|thanks\b|between\b|morning\b|afternoon\b|evening\b|tonight\b|night\b|monday\b|tuesday\b|wednesday\b|thursday\b|friday\b|saturday\b|sunday\b|am\b|pm\b)([A-Za-z][A-Za-z\-]{2,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{2,20})\b/i,
    /\b((?:19|20)\d{2})\b/,
  ]
  
  for (const p of vehiclePatterns) {
    const m = normalized.match(p)
    if (m) {
      // Filter out common non-vehicle words
      const excludeWords = ['another', 'other', 'different', 'new', 'old', 'car', 'vehicle', 'auto', 'thank', 'thanks', 'you', 'between', 'morning', 'afternoon', 'evening', 'tonight', 'night', 'am', 'pm', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const make = m[1]?.trim() || ''
      const model = m[2]?.trim() || ''
      const year = m[3]?.trim() || ''
      
      if (excludeWords.some(word => make.toLowerCase().includes(word) || model.toLowerCase().includes(word))) {
        continue // Skip this match
      }
      
      if (m.length === 4 && year) {
        // Year Make Model format
        const yearNum = parseInt(year, 10)
        result.vehicleYear = Number.isFinite(yearNum) ? yearNum : undefined
        result.vehicleMake = make
        result.vehicleModel = model
        result.vehicle = `${yearNum} ${make} ${model}`
      } else if (m.length === 4 && !year) {
        // Make Model Year format
        const yearNum = parseInt(model, 10)
        if (Number.isFinite(yearNum) && yearNum >= 1900 && yearNum <= 2030) {
          result.vehicleYear = yearNum
          result.vehicleMake = make
          result.vehicleModel = m[2].trim()
          result.vehicle = `${make} ${m[2].trim()} ${yearNum}`
        } else {
          result.vehicleMake = make
          result.vehicleModel = model
          result.vehicle = `${make} ${model}`
        }
      } else if (m.length === 3) {
        // Additional guard: avoid capturing phrases like "thank you"
        const phrase = `${make} ${model}`.toLowerCase()
        if (phrase.includes('thank you') || phrase === 'thank you') {
          continue
        }
        // Make Model only
        result.vehicleMake = make
        result.vehicleModel = model
        result.vehicle = `${make} ${model}`
      } else if (m.length === 2) {
        // Handle standalone year or make model
        if (make && make.match(/^(19|20)\d{2}$/)) {
          // Just a year
          result.vehicleYear = parseInt(make, 10)
        } else {
          // Make Model only
          result.vehicleMake = make
          result.vehicleModel = model
          result.vehicle = `${make} ${model}`
        }
      }
      break
    }
  }

  // Address: handle various ways addresses are mentioned
  const addressPatterns = [
    // Full address with city, state ZIP (flexible format) - "at 65 Dyer St Brockton MA 02302"
    /\b(?:address is|located at|at|address:|my address is|the address is)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n,]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
    // Just street address with city, state ZIP - "at 65 Dyer St Brockton MA 02302"
    /\b(?:address is|located at|at|address:|my address is|the address is)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n,]+\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
    // Simple street address (number + street name with suffix)
    /\b(?:address is|located at|at|address:|my address is|the address is|it's|its)\s+([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle))/i,
    // Standalone street address (number + street name with suffix) - no trigger words needed
    /\b([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle))\b/i,
    // Flexible address format (number + street name, city, state ZIP) - no suffix required
    /\b([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]*,\s*[A-Za-z][A-Za-z\s]*,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)\b/i,
    // Address with Suite/Apt (like "4 Hovendon Ave Suite 11 Brockton, MA 02302")
    /\b([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]*(?:\s+(?:Suite|Apt|Unit|#)\s*\d+)?,\s*[A-Za-z][A-Za-z\s]*,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)\b/i,
    // Handle "at 65 Dyer St Brockton MA 02302" format (no commas)
    /\b(?:at|address is|located at|my address is|the address is)\s+([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]+\s+[A-Za-z][A-Za-z\s]+\s+[A-Z]{2}\s*\d{5}(?:-\d{4})?)\b/i,
  ]
  
  // Check for incomplete addresses (just city names)
  const incompleteAddressPatterns = [
    /\b(?:address is|located at|at|address:|my address is|the address is|it's|its)\s+([A-Za-z][A-Za-z\s]{2,30})\b/i,
    /\b(?:in|at)\s+([A-Za-z][A-Za-z\s]{2,30})\b/i,
  ]
  
  // First check for complete addresses
  for (const p of addressPatterns) {
    const m = normalized.match(p)
    if (m) { 
      const address = m[1].trim()
      // Only accept if it has a street number (complete address)
      if (address.match(/^\d/)) {
        result.address = cleanupAddress(address)
        break
      }
    }
  }
  
  // If no complete address found, check for incomplete addresses
  if (!result.address) {
    for (const p of incompleteAddressPatterns) {
      const m = normalized.match(p)
      if (m) { 
        const location = m[1].trim()
        // Don't store incomplete addresses, but we can use this to prompt for more info
        result.address = null // Explicitly set to null for incomplete addresses
        break
      }
    }
  }

  // Service patterns
  const servicePatterns = [
    /\b(?:want|need|looking for|interested in|book|get|i want|i need|i'm looking for)\s+(?:a|an)?\s*(interior\s+detail|exterior\s+detail|full\s+detail|wash|wax|ppf|paint\s+protection|ceramic\s+coating|detailing|cleaning|car\s+wash|auto\s+detail|mobile\s+detail)/i,
    /\b(interior\s+detail|exterior\s+detail|full\s+detail|wash|wax|ppf|paint\s+protection|ceramic\s+coating|detailing|cleaning|car\s+wash|auto\s+detail|mobile\s+detail)\b/i,
    // Handle "want interior detail" format
    /\b(?:want|need|looking for|interested in|book|get|i want|i need|i'm looking for)\s+(interior\s+detail|exterior\s+detail|full\s+detail|wash|wax|ppf|paint\s+protection|ceramic\s+coating|detailing|cleaning|car\s+wash|auto\s+detail|mobile\s+detail)\b/i,
    // Handle "full detailing" or "interior cleaning" patterns
    /\b(full\s+detailing|interior\s+cleaning|exterior\s+cleaning|car\s+detailing|auto\s+detailing|mobile\s+detailing)\b/i,
  ]
  
  for (const p of servicePatterns) {
    const m = normalized.match(p)
    if (m) {
      const service = m[1]?.trim() || m[0]?.trim()
      if (service) {
        // If availableServices is provided, validate the service
        if (availableServices && availableServices.length > 0) {
          const normalizedService = service.toLowerCase()
          const matchingService = availableServices.find(avail => 
            avail.toLowerCase().includes(normalizedService) || 
            normalizedService.includes(avail.toLowerCase())
          )
          if (matchingService) {
            result.services = [matchingService]
            break
          }
        } else {
          // No validation, accept the service
          result.services = [service]
          break
        }
      }
    }
  }

  return result
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ')
}

function cleanupAddress(s: string): string {
  return s.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim()
}


