import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  const date = searchParams.get('date')

  if (!businessId || !date) {
    return NextResponse.json(
      { error: 'Business ID and date are required' },
      { status: 400 }
    )
  }

  try {
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

    console.log('🔍 Checking availability for:', { businessId, date })

    // Set up Google Calendar API
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: business.gcalAccessToken,
      refresh_token: business.gcalRefreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Parse the date - use local timezone
    const startDate = new Date(date + 'T00:00:00')
    const endDate = new Date(date + 'T23:59:59')

    console.log('📅 Date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    // Get events for the day
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    })

    const events = response.data.items || []
    console.log('📅 Found events:', events.length)
    events.forEach(event => {
      console.log(' Event:', {
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date
      })
    })

    // Generate time slots (9 AM to 6 PM, 1-hour slots)
    const timeSlots: TimeSlot[] = []
    const workingHours = business.availability as any

    // Default working hours if not set
    const startHour = workingHours?.workingHours?.mon?.start || 9
    const endHour = workingHours?.workingHours?.mon?.end || 18

    for (let hour = startHour; hour < endHour; hour++) {
      // Create slots in local time
      const slotStart = new Date(date + `T${hour.toString().padStart(2, '0')}:00:00`)
      const slotEnd = new Date(date + `T${(hour + 1).toString().padStart(2, '0')}:00:00`)

      // Check if slot conflicts with any events
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '')
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '')
        
        // Convert event times to local time for comparison
        const eventStartLocal = new Date(eventStart.getTime())
        const eventEndLocal = new Date(eventEnd.getTime())
        
        const conflict = (slotStart < eventEndLocal && slotEnd > eventStartLocal)
        if (conflict) {
          console.log('🚫 Conflict detected:', {
            slot: `${hour}:00-${hour + 1}:00`,
            event: event.summary,
            eventStartLocal: eventStartLocal.toLocaleString(),
            eventEndLocal: eventEndLocal.toLocaleString(),
            slotStart: slotStart.toLocaleString(),
            slotEnd: slotEnd.toLocaleString()
          })
        }
        return conflict
      })

      timeSlots.push({
        start: slotStart,
        end: slotEnd,
        available: !hasConflict
      })
    }

    console.log('⏰ Time slots:', timeSlots.map(slot => ({
      time: `${slot.start.getHours()}:00`,
      available: slot.available
    })))

    return NextResponse.json({
      success: true,
      data: {
        businessId,
        date,
        timeSlots,
        eventsFound: events.length
      }
    })
  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}
