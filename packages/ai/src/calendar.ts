import { PrismaClient } from '@reeva/db'

const prisma = new PrismaClient()

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export interface AvailabilityCheck {
  date: string
  timeSlots: TimeSlot[]
}

export class CalendarService {
  static async checkAvailability(businessId: string, date: string): Promise<AvailabilityCheck> {
    try {
      // Get existing bookings for the date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const existingBookings = await prisma.job.findMany({
        where: {
          businessId,
          scheduledDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        }
      })

      // Generate time slots (9 AM to 5 PM, 2-hour slots)
      const timeSlots: TimeSlot[] = []
      for (let hour = 9; hour <= 15; hour += 2) {
        const start = new Date(startOfDay)
        start.setHours(hour, 0, 0, 0)
        
        const end = new Date(startOfDay)
        end.setHours(hour + 2, 0, 0, 0)

        // Check if this slot conflicts with existing bookings
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.scheduledDate)
          const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000)
          
          return (start < bookingEnd && end > bookingStart)
        })

        timeSlots.push({
          start,
          end,
          available: !hasConflict
        })
      }

      return {
        date,
        timeSlots
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      throw error
    }
  }

  static async getAvailableSlots(businessId: string, date: string): Promise<TimeSlot[]> {
    const availability = await this.checkAvailability(businessId, date)
    return availability.timeSlots.filter(slot => slot.available)
  }

  static async isSlotAvailable(businessId: string, date: string, startTime: string): Promise<boolean> {
    try {
      const [hours, minutes] = startTime.split(':').map(Number)
      const slotStart = new Date(date)
      slotStart.setHours(hours, minutes, 0, 0)

      const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000) // 2 hours

      const conflictingBooking = await prisma.job.findFirst({
        where: {
          businessId,
          scheduledDate: {
            gte: slotStart,
            lt: slotEnd
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        }
      })

      return !conflictingBooking
    } catch (error) {
      console.error('Error checking slot availability:', error)
      return false
    }
  }
}