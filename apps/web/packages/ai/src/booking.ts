import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface BookingRequest {
  businessId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  vehicleType: string
  serviceType: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  duration: number // minutes
  notes?: string
}

export interface BookingResponse {
  success: boolean
  bookingId?: string
  calendarEventId?: string
  message: string
}

export class BookingService {
  static async createBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      // Get business with Google Calendar tokens
      const business = await prisma.business.findUnique({
        where: { id: request.businessId }
      })

      if (!business?.gcalAccessToken) {
        return {
          success: false,
          message: 'Business not connected to Google Calendar'
        }
      }

      // Set up Google Calendar API
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({
        access_token: business.gcalAccessToken,
        refresh_token: business.gcalRefreshToken
      })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      // Parse booking date and time
      const bookingDateTime = new Date(`${request.date}T${request.time}:00`)
      const endDateTime = new Date(bookingDateTime.getTime() + (request.duration * 60000))

      // Create calendar event
      const event = {
        summary: `Car Detailing - ${request.customerName}`,
        description: `
Service: ${request.serviceType}
Vehicle: ${request.vehicleType}
Customer: ${request.customerName}
Phone: ${request.customerPhone}
${request.customerEmail ? `Email: ${request.customerEmail}` : ''}
${request.notes ? `Notes: ${request.notes}` : ''}
        `.trim(),
        start: {
          dateTime: bookingDateTime.toISOString(),
          timeZone: business.timezone || 'America/New_York'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: business.timezone || 'America/New_York'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 } // 30 minutes before
          ]
        }
      }

      // Add event to Google Calendar
      const calendarResponse = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      })

      const calendarEventId = calendarResponse.data.id

      // Create booking record in database
      const booking = await prisma.job.create({
        data: {
          businessId: request.businessId,
          customerName: request.customerName,
          customerPhone: request.customerPhone,
          customerEmail: request.customerEmail,
          vehicleType: request.vehicleType,
          serviceType: request.serviceType,
          scheduledDate: bookingDateTime,
          duration: request.duration,
          status: 'SCHEDULED',
          notes: request.notes,
          calendarEventId: calendarEventId
        }
      })

      return {
        success: true,
        bookingId: booking.id,
        calendarEventId: calendarEventId,
        message: 'Booking created successfully!'
      }

    } catch (error) {
      console.error('Booking creation error:', error)
      return {
        success: false,
        message: 'Failed to create booking'
      }
    }
  }

  static async getBooking(bookingId: string) {
    return await prisma.job.findUnique({
      where: { id: bookingId }
    })
  }

  static async cancelBooking(bookingId: string): Promise<BookingResponse> {
    try {
      const booking = await prisma.job.findUnique({
        where: { id: bookingId }
      })

      if (!booking) {
        return {
          success: false,
          message: 'Booking not found'
        }
      }

      // Cancel in Google Calendar if event exists
      if (booking.calendarEventId) {
        const business = await prisma.business.findUnique({
          where: { id: booking.businessId }
        })

        if (business?.gcalAccessToken) {
          const oauth2Client = new google.auth.OAuth2()
          oauth2Client.setCredentials({
            access_token: business.gcalAccessToken,
            refresh_token: business.gcalRefreshToken
          })

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
          
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: booking.calendarEventId
          })
        }
      }

      // Update booking status
      await prisma.job.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      })

      return {
        success: true,
        message: 'Booking cancelled successfully'
      }

    } catch (error) {
      console.error('Booking cancellation error:', error)
      return {
        success: false,
        message: 'Failed to cancel booking'
      }
    }
  }
}
