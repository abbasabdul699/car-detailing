import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      businessId,
      customerName,
      customerPhone,
      customerEmail,
      vehicleType,
      serviceType,
      date,
      time,
      duration = 60,
      notes
    } = body

    // Validate required fields
    if (!businessId || !customerName || !customerPhone || !vehicleType || !serviceType || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get business with Google Calendar tokens
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business?.gcalAccessToken) {
      return NextResponse.json(
        { error: 'Business not connected to Google Calendar' },
        { status: 400 }
      )
    }

    // Set up Google Calendar API
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: business.gcalAccessToken,
      refresh_token: business.gcalRefreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Parse booking date and time
    const bookingDateTime = new Date(`${date}T${time}:00`)
    const endDateTime = new Date(bookingDateTime.getTime() + (duration * 60000))

    // Create calendar event
    const event = {
      summary: `Car Detailing - ${customerName}`,
      description: `
Service: ${serviceType}
Vehicle: ${vehicleType}
Customer: ${customerName}
Phone: ${customerPhone}
${customerEmail ? `Email: ${customerEmail}` : ''}
${notes ? `Notes: ${notes}` : ''}
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
        businessId,
        customerName,
        customerPhone,
        customerEmail,
        vehicleType,
        serviceType,
        scheduledDate: bookingDateTime,
        duration,
        status: 'SCHEDULED',
        notes,
        calendarEventId
      }
    })

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      calendarEventId,
      message: 'Booking created successfully!'
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
