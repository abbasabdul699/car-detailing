import { prisma } from './prisma'

export interface CustomerData {
  name?: string
  phone: string
  email?: string
  address?: string
  locationType?: 'home' | 'office' | 'other'
  vehicleInfo?: any[]
  preferredTime?: 'morning' | 'afternoon' | 'evening'
  flexibility?: 'urgent' | 'this_week' | 'whenever'
  tags?: string[]
  vehicle?: string
  source?: string
  notes?: string
}

export interface VehicleInfo {
  year?: number
  make?: string
  model?: string
  luxury?: boolean
  notes?: string
}

/**
 * Get or create a customer record
 */
export async function getOrCreateCustomer(detailerId: string, phone: string, customerData?: Partial<CustomerData>) {
  try {
    // First try to find existing customer
    let customer = await prisma.customer.findUnique({
      where: {
        detailerId_phone: { detailerId, phone }
      }
    })

    // If customer exists and we have new data, update them
    if (customer && customerData) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          ...(customerData.name && { name: customerData.name }),
          ...(customerData.email && { email: customerData.email }),
          ...(customerData.address && { address: customerData.address }),
          ...(customerData.locationType && { locationType: customerData.locationType }),
          ...(customerData.vehicleInfo && { vehicleInfo: customerData.vehicleInfo }),
          ...(customerData.preferredTime && { preferredTime: customerData.preferredTime }),
          ...(customerData.flexibility && { flexibility: customerData.flexibility }),
          ...(customerData.tags && { tags: customerData.tags }),
          ...(customerData.vehicle && { vehicle: customerData.vehicle }),
          ...(customerData.source && { source: customerData.source }),
          ...(customerData.notes && { notes: customerData.notes }),
          updatedAt: new Date()
        }
      })
    }

    // If customer doesn't exist, create them
    if (!customer && customerData?.name) {
      customer = await prisma.customer.create({
        data: {
          detailerId,
          phone,
          name: customerData.name,
          email: customerData.email,
          address: customerData.address,
          locationType: customerData.locationType,
          vehicleInfo: customerData.vehicleInfo,
          preferredTime: customerData.preferredTime,
          flexibility: customerData.flexibility,
          tags: customerData.tags || [],
          vehicle: customerData.vehicle,
          source: customerData.source,
          notes: customerData.notes
        }
      })
    }

    return customer
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error)
    return null
  }
}

/**
 * Extract customer data from snapshot data
 */
export function extractCustomerDataFromSnapshot(snapshot: any): Partial<CustomerData> {
  const customerData: Partial<CustomerData> = {
    phone: snapshot.customerPhone
  }

  if (snapshot.customerName) {
    customerData.name = snapshot.customerName
  }

  if (snapshot.customerEmail) {
    customerData.email = snapshot.customerEmail
  }

  if (snapshot.address) {
    customerData.address = snapshot.address
  }

  if (snapshot.locationType) {
    customerData.locationType = snapshot.locationType
  }

  if (snapshot.vehicleYear || snapshot.vehicleMake || snapshot.vehicleModel) {
    const vehicleInfo: VehicleInfo = {}
    if (snapshot.vehicleYear) vehicleInfo.year = snapshot.vehicleYear
    if (snapshot.vehicleMake) vehicleInfo.make = snapshot.vehicleMake
    if (snapshot.vehicleModel) vehicleInfo.model = snapshot.vehicleModel
    if (snapshot.vehicle) vehicleInfo.notes = snapshot.vehicle
    
    customerData.vehicleInfo = [vehicleInfo]
  }

  return customerData
}

/**
 * Update customer with booking information
 */
export async function updateCustomerWithBooking(customerId: string, bookingId: string) {
  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { 
        lastDetailId: bookingId,
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Error updating customer with booking:', error)
  }
}
