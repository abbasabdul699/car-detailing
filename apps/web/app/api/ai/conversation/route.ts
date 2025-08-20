import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { message, stage = 'greeting', context = {} } = await request.json()
    
    console.log('🔍 AI Request:', { message, stage, context })
    
    // Add 5-second delay to simulate human response time
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Handle initial greeting
    if (stage === 'greeting' || !context.conversationStarted) {
      return NextResponse.json({
        response: `Hi there! I'm Arian, your car detailing concierge. I can help you schedule appointments, check availability, and answer questions about our services. 

What can I help you with today?`,
        nextStage: 'service_inquiry',
        context: { ...context, conversationStarted: true }
      })
    }
    
    // Handle time selection FIRST (before booking request detection)
    if (stage === 'time_selection' && context.availableSlots) {
      const selectedTime = extractTimeFromMessage(message)
      console.log('🕐 Extracted time:', selectedTime)
      console.log(' Available slots:', context.availableSlots)
      
      if (selectedTime) {
        if (context.availableSlots.includes(selectedTime)) {
          console.log('✅ Time is available, creating booking...')
          // Create the booking
          try {
            const bookingResult = await createBooking({
              businessId: context.businessId || '689e47ec6df928b450daa9c0',
              customerName: context.customerName || 'Customer',
              customerPhone: context.customerPhone || '',
              vehicleType: context.vehicleType || 'Car',
              serviceType: 'Interior Detail',
              date: context.selectedDate,
              time: selectedTime,
              duration: 60,
              notes: context.notes || ''
            })
            
            if (bookingResult.success) {
              return NextResponse.json({
                response: `Perfect! Your appointment has been confirmed for ${context.selectedDate} at ${selectedTime}. You'll receive a confirmation shortly. Your booking ID is: ${bookingResult.bookingId}`,
                nextStage: 'booking_confirmed',
                bookingId: bookingResult.bookingId,
                context: { ...context, bookingCompleted: true }
              })
            } else {
              return NextResponse.json({
                response: "I'm sorry, there was an issue creating your appointment. Please try again or contact us directly.",
                nextStage: 'error',
                context: { ...context, bookingError: true }
              })
            }
          } catch (error) {
            console.error('Booking creation error:', error)
            return NextResponse.json({
              response: "I'm sorry, there was an issue creating your appointment. Please try again.",
              nextStage: 'error',
              context: { ...context, bookingError: error.message }
            })
          }
        } else {
          console.log('❌ Time not available')
          return NextResponse.json({
            response: `I'm sorry, ${selectedTime} is not available. Here are the available slots: ${context.availableSlots.join(', ')}. Please choose one of these times.`,
            nextStage: 'time_selection',
            context: { ...context }
          })
        }
      } else {
        console.log('❌ Time not recognized')
        return NextResponse.json({
          response: `I didn't catch that time. Here are the available slots again: ${context.availableSlots.join(', ')}. Please choose one of these times.`,
          nextStage: 'time_selection',
          context: { ...context }
        })
      }
    }
    
    // Check if user wants to book an appointment (only if not in time_selection stage)
    if (stage !== 'time_selection' && (
        message.toLowerCase().includes('monday') || 
        message.toLowerCase().includes('appointment') ||
        message.toLowerCase().includes('schedule') ||
        message.toLowerCase().includes('book') ||
        message.toLowerCase().includes('next') ||
        message.toLowerCase().includes('available') ||
        message.toLowerCase().includes('august') ||
        message.toLowerCase().includes('18'))) {
      
      console.log('📅 Detected booking request')
      
      // Check if user mentioned a specific date
      let targetDate: Date
      let dateString: string
      let displayDate: string
      
      // Improved date detection
      if (message.toLowerCase().includes('august 18') || 
          message.toLowerCase().includes('18th') ||
          message.toLowerCase().includes('18')) {
        // User specifically mentioned August 18th
        targetDate = new Date('2025-08-18')
        dateString = '2025-08-18'
        displayDate = 'August 18th, 2025' // Use explicit date string
        console.log('📅 User requested specific date: August 18th')
      } else if (message.toLowerCase().includes('monday')) {
        // User mentioned Monday - get next Monday
        targetDate = getNextMonday()
        dateString = targetDate.toISOString().split('T')[0]
        displayDate = targetDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
        console.log('📅 Using next Monday:', dateString)
      } else {
        // Default to next Monday
        targetDate = getNextMonday()
        dateString = targetDate.toISOString().split('T')[0]
        displayDate = targetDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
        console.log('📅 Using next Monday (default):', dateString)
      }
      
      console.log('📅 Checking availability for:', dateString)
      console.log('📅 Display date will be:', displayDate)
      
      try {
        // Check availability for the target date
        const availability = await checkAvailability(
          context.businessId || '689e47ec6df928b450daa9c0', // Default to your business
          dateString
        )
        
        console.log('✅ Availability check successful:', availability)
        
        // Find available time slots
        const availableSlots = availability.timeSlots
          .filter((slot: any) => slot.available)
          .map((slot: any) => {
            const time = new Date(slot.start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
            return time
          })
        
        console.log(' Available slots:', availableSlots)
        
        if (availableSlots.length === 0) {
          return NextResponse.json({
            response: `I apologize, but we don't have any available time slots for ${displayDate}. Would you like to check availability for another day?`,
            nextStage: 'availability_check',
            context: { ...context, lastCheckedDate: dateString }
          })
        }
        
        return NextResponse.json({
          response: `Great! I can see we have availability for ${displayDate}. Here are the available time slots:\n\n${availableSlots.join(', ')}\n\nWhat time would you prefer for your appointment?`,
          nextStage: 'time_selection',
          action: 'show_availability',
          data: { date: dateString, availableSlots },
          context: { ...context, availableSlots, selectedDate: dateString }
        })
        
      } catch (error) {
        console.error('❌ Calendar availability error:', error)
        return NextResponse.json({
          response: `I'm having trouble checking our availability right now. Error: ${error.message}. Could you please try again in a moment?`,
          nextStage: 'error',
          context: { ...context, lastError: error.message }
        })
      }
    }
    
    // Default AI response for other messages
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are Arian, a professional car detailing concierge. Be helpful, friendly, and professional. If someone wants to book an appointment, ask them to specify a date and time. Keep responses concise and focused. Always refer to yourself as Arian.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 150
    })
    
    return NextResponse.json({
      response: completion.choices[0].message.content || "I'm sorry, I didn't understand that. Could you please rephrase?",
      context: { ...context }
    })
    
  } catch (error) {
    console.error('❌ AI conversation error:', error)
    return NextResponse.json({
      response: `I'm sorry, I'm having trouble right now. Error: ${error.message}. Please try again.`,
      nextStage: 'error'
    }, { status: 500 })
  }
}

function getNextMonday(): Date {
  const today = new Date()
  console.log('📅 Today is:', today.toDateString())
  
  // Calculate days until next Monday
  const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  let daysUntilMonday = 1 - currentDay // Days until next Monday
  
  // If today is Monday, get next Monday (7 days later)
  if (currentDay === 1) {
    daysUntilMonday = 7
  }
  // If today is after Monday, get next Monday
  else if (currentDay > 1) {
    daysUntilMonday = 8 - currentDay
  }
  
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  
  console.log('📅 Next Monday is:', nextMonday.toDateString())
  return nextMonday
}

function extractTimeFromMessage(message: string): string | null {
  // Extract time from message (e.g., "2 PM", "2:00 PM", "14:00")
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/i
  const match = message.match(timeRegex)
  
  if (match) {
    let hour = parseInt(match[1])
    const minute = match[2] ? parseInt(match[2]) : 0
    const period = match[3]?.toLowerCase()
    
    if (period === 'pm' && hour !== 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    
    // Create a proper time string instead of using toLocaleTimeString
    const timeString = new Date(2024, 0, 1, hour, minute).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    return timeString
  }
  
  return null
}

// Inline availability checking function
async function checkAvailability(businessId: string, date: string) {
  console.log('🔍 Starting availability check for business:', businessId, 'date:', date)
  
  try {
    // Get business with Google Calendar tokens
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    console.log('🏢 Business found:', business ? 'Yes' : 'No')
    console.log('🔑 Has access token:', !!business?.gcalAccessToken)

    if (!business?.gcalAccessToken) {
      throw new Error('Business not found or Google Calendar not connected')
    }

    // Create Google Calendar API client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: business.gcalAccessToken,
      refresh_token: business.gcalRefreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Get events for the specified date - Fix the date format
    const startOfDay = new Date(date + 'T00:00:00-04:00') // Use timezone offset
    const endOfDay = new Date(date + 'T23:59:59-04:00')

    console.log('📅 Fetching calendar events from:', startOfDay.toISOString(), 'to:', endOfDay.toISOString())

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    })

    const events = response.data.items || []
    console.log('📅 Found events:', events.length)

    // Create time slots (9 AM to 6 PM, 1-hour slots)
    const timeSlots = []
    for (let hour = 9; hour < 18; hour++) {
      const slotStart = new Date(date + `T${hour.toString().padStart(2, '0')}:00:00-04:00`)
      const slotEnd = new Date(date + `T${(hour + 1).toString().padStart(2, '0')}:00:00-04:00`)

      // Check if slot conflicts with any events
      const hasConflict = events.some((event: any) => {
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

    console.log(' Created time slots:', timeSlots.length)
    return { businessId, date, timeSlots }
  } catch (error) {
    console.error('❌ Calendar availability check error:', error)
    
    // If it's an auth error, suggest re-authenticating
    if (error.message.includes('invalid_request') || error.message.includes('unauthorized')) {
      throw new Error('Google Calendar access expired. Please re-authenticate.')
    }
    
    throw error
  }
}

// Inline booking creation function
async function createBooking(bookingData: any) {
  try {
    console.log('📝 Creating booking:', bookingData)
    
    const business = await prisma.business.findUnique({
      where: { id: bookingData.businessId }
    })

    if (!business?.gcalAccessToken) {
      throw new Error('Business not found or Google Calendar not connected')
    }

    // Create Google Calendar API client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: business.gcalAccessToken,
      refresh_token: business.gcalRefreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Parse the time properly
    const timeMatch = bookingData.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!timeMatch) {
      throw new Error('Invalid time format')
    }
    
    let hour = parseInt(timeMatch[1])
    const minute = parseInt(timeMatch[2])
    const period = timeMatch[3].toLowerCase()
    
    // Convert to 24-hour format
    if (period === 'pm' && hour !== 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    
    // Create proper date objects
    const eventStart = new Date(`${bookingData.date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00-04:00`)
    const eventEnd = new Date(eventStart.getTime() + bookingData.duration * 60000)

    console.log('📅 Event start:', eventStart.toISOString())
    console.log('📅 Event end:', eventEnd.toISOString())

    const event = {
      summary: `Car Detailing - ${bookingData.customerName}`,
      description: `Service: ${bookingData.serviceType}\nVehicle: ${bookingData.vehicleType}\nPhone: ${bookingData.customerPhone}\nNotes: ${bookingData.notes || 'None'}`,
      start: {
        dateTime: eventStart.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: eventEnd.toISOString(),
        timeZone: 'America/New_York'
      }
    }

    const calendarResponse = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    })

    // Create database record
    const booking = await prisma.job.create({
      data: {
        businessId: bookingData.businessId,
        customerName: bookingData.customerName,
        customerPhone: bookingData.customerPhone,
        customerEmail: bookingData.customerEmail,
        vehicleType: bookingData.vehicleType,
        serviceType: bookingData.serviceType,
        service: bookingData.serviceType,
        scheduledDate: eventStart,
        duration: bookingData.duration,
        status: 'SCHEDULED',
        notes: bookingData.notes,
        calendarEventId: calendarResponse.data.id
      }
    })

    console.log('✅ Booking created successfully:', booking.id)
    return {
      success: true,
      bookingId: booking.id,
      calendarEventId: calendarResponse.data.id
    }
  } catch (error) {
    console.error('❌ Booking creation error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
