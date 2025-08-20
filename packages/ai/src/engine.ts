import { CalendarService } from './calendar'
import { BookingService } from './booking'

export interface ConversationStage {
  id: string
  name: string
  prompt: string
  nextStage?: string
  requiresAction?: boolean
}

export const CONVERSATION_STAGES: ConversationStage[] = [
  {
    id: 'greeting',
    name: 'Greeting',
    prompt: `You are a professional car detailing concierge for Reeva Car. 
    
Start by warmly greeting the customer and introducing yourself as their personal detailing assistant. Ask how you can help them today.

Keep your response friendly, professional, and under 2 sentences.`
  },
  {
    id: 'service_inquiry',
    name: 'Service Inquiry',
    prompt: `Ask the customer what type of car detailing service they're looking for. 
    
Offer these options:
- Basic Wash (exterior only)
- Full Detail (interior & exterior)
- Interior Detail (interior only)
- Premium Detail (comprehensive)

Be helpful and guide them to the best option for their needs.`
  },
  {
    id: 'vehicle_info',
    name: 'Vehicle Information',
    prompt: `Ask about their vehicle to provide accurate pricing and service recommendations.
    
Ask for:
- Vehicle type (sedan, SUV, truck, etc.)
- Vehicle size (small, medium, large)
- Any specific concerns or areas of focus

This helps us provide the best service and accurate pricing.`
  },
  {
    id: 'availability_check',
    name: 'Availability Check',
    prompt: `Ask when they'd like to schedule their detailing service.
    
Ask for:
- Preferred date
- Preferred time (morning, afternoon, evening, or specific time)
- How soon they need it (urgent, this week, flexible)

Once they provide this information, I'll check our availability and offer them available time slots.`,
    requiresAction: true
  },
  {
    id: 'booking_confirmation',
    name: 'Booking Confirmation',
    prompt: `Great! I have availability for your requested time. Let me confirm the booking details:

Service: {service_type}
Vehicle: {vehicle_type}
Date: {date}
Time: {time}

Please provide:
- Your name
- Phone number
- Any special requests or notes

Once confirmed, I'll create your booking and send you a confirmation.`,
    requiresAction: true
  },
  {
    id: 'booking_complete',
    name: 'Booking Complete',
    prompt: `Perfect! Your booking has been confirmed and added to our calendar.

Booking Details:
- Service: {service_type}
- Vehicle: {vehicle_type}
- Date: {date}
- Time: {time}
- Booking ID: {booking_id}

You'll receive a confirmation email and calendar invite. We'll also send you a reminder 24 hours before your appointment.

Is there anything else I can help you with today?`
  }
]

export async function generateResponse(
  message: string,
  stage: string,
  context: any = {}
): Promise<{ response: string; nextStage?: string; action?: string; data?: any }> {
  
  // Check if user wants to book an appointment
  if (message.toLowerCase().includes('monday') || 
      message.toLowerCase().includes('appointment') ||
      message.toLowerCase().includes('schedule') ||
      message.toLowerCase().includes('book')) {
    
    // Get next Monday's date
    const nextMonday = getNextMonday()
    const dateString = nextMonday.toISOString().split('T')[0] // YYYY-MM-DD
    
    try {
      // Check availability for next Monday
      const availability = await CalendarService.checkAvailability(
        context.businessId || '689e47ec6df928b450daa9c0', // Default to your business
        dateString
      )
      
      // Find available time slots
      const availableSlots = availability.timeSlots
        .filter(slot => slot.available)
        .map(slot => {
          const time = new Date(slot.start).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          return time
        })
      
      if (availableSlots.length === 0) {
        return {
          response: `I apologize, but we don't have any available time slots for next Monday (${nextMonday.toLocaleDateString()}). Would you like to check availability for another day?`,
          nextStage: 'availability_check'
        }
      }
      
      return {
        response: `Great! I can see we have availability for next Monday (${nextMonday.toLocaleDateString()}). Here are the available time slots:\n\n${availableSlots.join(', ')}\n\nWhat time would you prefer for your appointment?`,
        nextStage: 'time_selection',
        action: 'show_availability',
        data: { date: dateString, availableSlots }
      }
      
    } catch (error) {
      console.error('Error checking availability:', error)
      return {
        response: "I'm having trouble checking our availability right now. Could you please try again in a moment?",
        nextStage: 'error'
      }
    }
  }
  
  // Default AI response for other messages
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
  
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a professional car detailing concierge. Be helpful, friendly, and professional. If someone wants to book an appointment, ask them to specify a date and time.`
      },
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 150
  })
  
  return {
    response: completion.choices[0].message.content || "I'm sorry, I didn't understand that. Could you please rephrase?"
  }
}

function getNextMonday(): Date {
  const today = new Date()
  const daysUntilMonday = (8 - today.getDay()) % 7
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  return nextMonday
}

async function handleStageAction(stage: ConversationStage, message: string, context: any): Promise<string> {
  switch (stage.id) {
    case 'availability_check':
      return await handleAvailabilityCheck(message, context)
    
    case 'booking_confirmation':
      return await handleBookingConfirmation(message, context)
    
    default:
      return stage.prompt
  }
}

async function handleAvailabilityCheck(message: string, context: any): Promise<string> {
  try {
    // Extract date and time from message
    const dateMatch = message.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/)
    const timeMatch = message.match(/(\d{1,2}:\d{2}\s*(am|pm)?|morning|afternoon|evening)/i)
    
    if (!dateMatch) {
      return "I'd be happy to check our availability! What date would you like to schedule your detailing service? (Please provide a date like 'August 20' or '8/20/2025')"
    }

    // Parse date
    let date = dateMatch[1]
    if (date.includes('/')) {
      const [month, day, year] = date.split('/')
      date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Check availability
    const businessId = context.businessId || '689e47ec6df928b450daa9c0' // Default for testing
    const availability = await CalendarService.checkAvailability(businessId, date)
    
    const availableSlots = availability.timeSlots.filter(slot => slot.available)
    
    if (availableSlots.length === 0) {
      return `I'm sorry, but we don't have any available time slots on ${date}. Would you like to check availability for a different date?`
    }

    // Format available times
    const timeSlots = availableSlots.map(slot => 
      new Date(slot.start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    ).join(', ')

    return `Great! I have several available time slots on ${date}: ${timeSlots}. 

Which time works best for you? Once you choose a time, I'll help you complete the booking.`
    
  } catch (error) {
    console.error('Availability check error:', error)
    return "I'm having trouble checking our availability right now. Please try again or contact us directly."
  }
}

async function handleBookingConfirmation(message: string, context: any): Promise<string> {
  try {
    // Extract customer information from message
    const nameMatch = message.match(/name[:\s]+([a-zA-Z\s]+)/i)
    const phoneMatch = message.match(/phone[:\s]+(\d{10,})/i)
    
    if (!nameMatch || !phoneMatch) {
      return "To complete your booking, I need your name and phone number. Please provide them in this format: 'Name: John Doe, Phone: 1234567890'"
    }

    const customerName = nameMatch[1].trim()
    const customerPhone = phoneMatch[1].trim()

    // Create booking
    const bookingRequest = {
      businessId: context.businessId || '689e47ec6df928b450daa9c0',
      customerName,
      customerPhone,
      customerEmail: context.customerEmail,
      vehicleType: context.vehicleType || 'Sedan',
      serviceType: context.serviceType || 'Full Detail',
      date: context.date,
      time: context.time,
      duration: 60,
      notes: context.notes
    }

    const bookingResult = await BookingService.createBooking(bookingRequest)
    
    if (bookingResult.success) {
      return `Perfect! Your booking has been confirmed and added to our calendar.

Booking Details:
- Service: ${bookingRequest.serviceType}
- Vehicle: ${bookingRequest.vehicleType}
- Date: ${bookingRequest.date}
- Time: ${bookingRequest.time}
- Booking ID: ${bookingResult.bookingId}

You'll receive a confirmation email and calendar invite. We'll also send you a reminder 24 hours before your appointment.

Is there anything else I can help you with today?`
    } else {
      return "I'm sorry, there was an issue creating your booking. Please try again or contact us directly for assistance."
    }
    
  } catch (error) {
    console.error('Booking confirmation error:', error)
    return "I'm having trouble completing your booking right now. Please try again or contact us directly."
  }
}

export async function checkDetailerAvailability(businessId: string, date: string) {
  try {
    const availableSlots = await CalendarService.getAvailableSlots(businessId, date)
    
    if (availableSlots.length === 0) {
      return {
        available: false,
        message: "I'm sorry, but I don't have any available time slots on that date."
      }
    }

    const timeSlots = availableSlots.map(slot => 
      new Date(slot.start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    ).join(', ')

    return {
      available: true,
      message: `Great! I have several available time slots: ${timeSlots}. When would you prefer?`,
      slots: availableSlots
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    return {
      available: false,
      message: "I'm having trouble checking my availability right now. Please try again later."
    }
  }
}
