import { prisma } from '@/lib/prisma'

export type SnapshotUpdate = {
  customerName?: string | null
  address?: string | null
  vehicle?: string | null
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

  // Vehicle: capture year (19xx/20xx), make, model with a modest length
  // Examples: "I have a 2023 Toyota RAV4", "driving a 2018 Honda Civic"
  const vehiclePatterns = [
    /\b(?:have|driving|drive|car is|vehicle is)\s+(?:a|an)?\s*((?:19|20)\d{2}\s+[A-Za-z][A-Za-z\-]{1,20}\s+[A-Za-z0-9][A-Za-z0-9\-]{1,20})\b/i,
    /\b(?:have|driving|drive|car is|vehicle is)\s+(?:a|an)?\s*([A-Za-z][A-Za-z\-]{1,20}\s+[A-Za-z0-9][A-Za-z0-9\-]{1,20})\b/i,
  ]
  for (const p of vehiclePatterns) {
    const m = normalized.match(p)
    if (m) { result.vehicle = m[1].trim(); break }
  }

  // Address: handle “at/Address is/located at” and allow comma-separated city, state ZIP
  const addressPatterns = [
    /\b(?:address is|located at|at|address:)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n,]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
    /\b(?:address is|located at|at|address:)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n,]+\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
  ]
  for (const p of addressPatterns) {
    const m = normalized.match(p)
    if (m) { result.address = cleanupAddress(m[1]); break }
  }

  return result
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ')
}

function cleanupAddress(s: string): string {
  return s.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim()
}


