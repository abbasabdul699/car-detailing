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
  const normalized = text.trim()

  // Name patterns
  const nameMatch = normalized.match(/\bmy name is\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i)
  if (nameMatch) result.customerName = nameMatch[1].trim()

  // Vehicle patterns (simple)
  const vehicleMatch = normalized.match(/\b(?:have|driving|drive|car is)\s+(a|an)?\s*([a-zA-Z0-9][^,.\n]{2,40})/i)
  if (vehicleMatch) result.vehicle = vehicleMatch[2].trim()

  // Address detection (very naive; prefer front-end address capture to refine)
  const addrMatch = normalized.match(/\b(?:at|address is|location is)\s+([0-9]{1,6}[^\n,]*?,\s*[^\n]*?\b[A-Z]{2}\b\s*\d{5})/i)
  if (addrMatch) result.address = addrMatch[1].trim()

  return result
}


