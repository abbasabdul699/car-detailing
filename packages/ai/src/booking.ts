import { PrismaClient } from '@reeva/db'

const prisma = new PrismaClient()

export interface BookingRequest {
  businessId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  vehicleType: string
  serviceType: string
  date: string
  time: string
  duration: number
  notes?: string
  contactId?: string
}

export interface BookingResponse {
  success: boolean
  bookingId?: string
  message?: string
}

export class BookingService {
  static async createBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      // Parse the date and time
      const [hours, minutes] = request.time.split(':').map(Number)
      const scheduledDate = new Date(request.date)
      scheduledDate.setHours(hours, minutes, 0, 0)

      // Create the booking
      const job = await prisma.job.create({
        data: {
          businessId: request.businessId,
          customerName: request.customerName,
          customerPhone: request.customerPhone,
          customerEmail: request.customerEmail,
          vehicleType: request.vehicleType,
          serviceType: request.serviceType,
          scheduledDate,
          duration: request.duration,
          status: 'SCHEDULED',
          notes: request.notes || 'Booked via SMS',
          contactId: request.contactId
        }
      })

      return {
        success: true,
        bookingId: job.id,
        message: 'Booking created successfully'
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      return {
        success: false,
        message: 'Failed to create booking'
      }
    }
  }

  static async getBooking(bookingId: string) {
    try {
      return await prisma.job.findUnique({
        where: { id: bookingId },
        include: {
          business: true,
          contact: true
        }
      })
    } catch (error) {
      console.error('Error fetching booking:', error)
      return null
    }
  }

  static async updateBookingStatus(bookingId: string, status: string) {
    try {
      return await prisma.job.update({
        where: { id: bookingId },
        data: { status }
      })
    } catch (error) {
      console.error('Error updating booking status:', error)
      return null
    }
  }

  static async cancelBooking(bookingId: string) {
    try {
      return await prisma.job.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      })
    } catch (error) {
      console.error('Error cancelling booking:', error)
      return null
    }
  }
}