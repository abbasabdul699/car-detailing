import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export interface AvailabilityCheck {
  businessId: string
  date: string // YYYY-MM-DD format
  timeSlots: TimeSlot[]
}

export class CalendarService {
  static async checkAvailability(businessId: string, date: string): Promise<AvailabilityCheck> {
    try {
      // Get business with Google Calendar tokens
      const business = await prisma.business.findUnique({
        where: { id: businessId }
      })

      if (!business?.gcalAccessToken) {
        throw new Error('Business not connected to Google Calendar')
      }

      // Set up Google Calendar API
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({
        access_token: business.gcalAccessToken,
        refresh_token: business.gcalRefreshToken
      })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      // Parse the date
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)

      // Get events for the day
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events = response.data.items || []

      // Generate time slots (9 AM to 6 PM, 1-hour slots)
      const timeSlots: TimeSlot[] = []
      const workingHours = business.availability as any

      // Default working hours if not set
      const startHour = workingHours?.workingHours?.mon?.start || 9
      const endHour = workingHours?.workingHours?.mon?.end || 18

      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(startDate)
        slotStart.setHours(hour, 0, 0, 0)
        
        const slotEnd = new Date(startDate)
        slotEnd.setHours(hour + 1, 0, 0, 0)

        // Check if slot conflicts with any events
        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date || '')
          const eventEnd = new Date(event.end?.dateTime || event.end?.date || '')
          
          return (slotStart < eventEnd && slotEnd > eventStart)
        })

        timeSlots.push({
          start: slotStart,
          end: slotEnd,
          available: !hasConflict
        })
      }

      return {
        businessId,
        date,
        timeSlots
      }
    } catch (error) {
      console.error('Calendar availability check error:', error)
      throw error
    }
  }

  static async getAvailableSlots(businessId: string, date: string): Promise<TimeSlot[]> {
    const availability = await this.checkAvailability(businessId, date)
    return availability.timeSlots.filter(slot => slot.available)
  }
}
