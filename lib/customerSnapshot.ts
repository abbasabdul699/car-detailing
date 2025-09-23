import { prisma } from '@/lib/prisma'

export type SnapshotUpdate = {
  customerName?: string | null
  address?: string | null
  vehicle?: string | null
  vehicleYear?: number | null
  vehicleMake?: string | null
  vehicleModel?: string | null
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
  if (update.address !== undefined) cleaned.address = update.address
  if (update.vehicle !== undefined) cleaned.vehicle = update.vehicle
  if (update.vehicleYear !== undefined) cleaned.vehicleYear = update.vehicleYear
  if (update.vehicleMake !== undefined) cleaned.vehicleMake = update.vehicleMake
  if (update.vehicleModel !== undefined) cleaned.vehicleModel = update.vehicleModel
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
export function extractSnapshotHints(text: string) {
  const result: SnapshotUpdate = {}
  const normalized = collapseWhitespace(text).trim()

  // Name patterns
  const namePatterns = [
    /\bmy name is\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i,
    /\bi am\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i,
    /\bthis is\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i,
  ]
  for (const p of namePatterns) {
    const m = normalized.match(p)
    if (m) { result.customerName = m[1].trim(); break }
  }

  // Vehicle: capture year (19xx/20xx), make, model with better filtering
  // Examples: "I have a 2023 Toyota RAV4", "driving a 2018 Honda Civic", "it's a Toyota Sienna 2007"
  const vehiclePatterns = [
    // Year Make Model: "2023 Toyota RAV4", "2015 Honda Civic"
    /\b(?:have|driving|drive|car is|vehicle is|it's a|its a)\s+(?:a|an)?\s*((?:19|20)\d{2})\s+([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\b/i,
    // Make Model Year: "Toyota Sienna 2007", "Honda Accord 2019"
    /\b(?:have|driving|drive|car is|vehicle is|it's a|its a)\s+(?:a|an)?\s*([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\s+((?:19|20)\d{2})\b/i,
    // Make Model only: "Toyota Camry", "Honda Civic"
    /\b(?:have|driving|drive|car is|vehicle is|it's a|its a)\s+(?:a|an)?\s*([A-Za-z][A-Za-z\-]{1,20})\s+([A-Za-z0-9][A-Za-z0-9\-]{1,20})\b/i,
  ]
  
  for (const p of vehiclePatterns) {
    const m = normalized.match(p)
    if (m) {
      // Filter out common non-vehicle words
      const excludeWords = ['another', 'other', 'different', 'new', 'old', 'car', 'vehicle', 'auto']
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
        // Make Model only
        result.vehicleMake = make
        result.vehicleModel = model
        result.vehicle = `${make} ${model}`
      }
      break
    }
  }

  // Address: handle various ways addresses are mentioned
  const addressPatterns = [
    // Full address with city, state ZIP
    /\b(?:address is|located at|at|address:|my address is|the address is)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n,]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
    // Just street address with city, state ZIP
    /\b(?:address is|located at|at|address:|my address is|the address is)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n,]+\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
    // Simple street address (number + street name)
    /\b(?:address is|located at|at|address:|my address is|the address is|it's|its)\s+([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle))/i,
    // Standalone street address (number + street name) - no trigger words needed
    /\b([0-9]{1,6}\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle))\b/i,
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

  return result
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ')
}

function cleanupAddress(s: string): string {
  return s.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim()
}


