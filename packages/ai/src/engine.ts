import { CalendarService } from './calendar'
import { BookingService } from './booking'
import { PrismaClient } from '@reeva/db'
import OpenAI from 'openai'

const prisma = new PrismaClient()

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
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  // Get conversation history for context
  const conversationHistory = await getConversationHistory(context.conversationId)
  
  // Handle different conversation stages
  switch (stage) {
    case 'greeting':
      return await handleGreeting(message, openai, conversationHistory)
    
    case 'service_inquiry':
      return await handleServiceInquiry(message, openai, conversationHistory)
    
    case 'vehicle_info':
      return await handleVehicleInfo(message, openai, conversationHistory)
    
    case 'availability_check':
      return await handleAvailabilityCheck(message, context)
    
    case 'booking_confirmation':
      return await handleBookingConfirmation(message, context)
    
    case 'booking_complete':
      return await handleBookingComplete(message, openai, conversationHistory)
    
    default:
      return await handleDefaultResponse(message, openai, conversationHistory)
  }
}

async function getConversationHistory(conversationId: string) {
  if (!conversationId) return []
  
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 10 // Last 10 messages for context
  })
  
  return messages.map(msg => ({
    role: msg.role,
    content: msg.text
  }))
}

async function handleGreeting(message: string, openai: OpenAI, history: any[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a professional car detailing concierge for Reeva Car. 
        
Start by warmly greeting the customer and introducing yourself as their personal detailing assistant. Ask how you can help them today.

Keep your response friendly, professional, and under 2 sentences.`
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 150
  })
  
  return {
    response: completion.choices[0].message.content || "Hello! I'm your personal car detailing assistant. How can I help you today?",
    nextStage: 'service_inquiry'
  }
}

async function handleServiceInquiry(message: string, openai: OpenAI, history: any[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Ask the customer what type of car detailing service they're looking for. 
        
Offer these options:
- Basic Wash (exterior only)
- Full Detail (interior & exterior)
- Interior Detail (interior only)
- Premium Detail (comprehensive)

Be helpful and guide them to the best option for their needs.`
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 150
  })
  
  return {
    response: completion.choices[0].message.content || "What type of car detailing service are you looking for? We offer Basic Wash, Full Detail, Interior Detail, and Premium Detail services.",
    nextStage: 'vehicle_info'
  }
}

async function handleVehicleInfo(message: string, openai: OpenAI, history: any[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Ask about their vehicle to provide accurate pricing and service recommendations.
        
Ask for:
- Vehicle type (sedan, SUV, truck, etc.)
- Vehicle size (small, medium, large)
- Any specific concerns or areas of focus

This helps us provide the best service and accurate pricing.`
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 150
  })
  
  return {
    response: completion.choices[0].message.content || "Great! To provide you with accurate pricing, could you tell me about your vehicle? What type of vehicle is it (sedan, SUV, truck, etc.) and are there any specific areas you'd like us to focus on?",
    nextStage: 'availability_check'
  }
}

async function handleAvailabilityCheck(message: string, context: any) {
  try {
    // Extract date and time from message
    const dateMatch = message.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
    
    if (!dateMatch) {
      return {
        response: "I'd be happy to check our availability! What date would you like to schedule your detailing service? (Please provide a date like 'August 20', 'tomorrow', or 'next Monday')",
        nextStage: 'availability_check'
      }
    }

    // Parse date
    let date = dateMatch[1].toLowerCase()
    let targetDate: Date

    if (date === 'today') {
      targetDate = new Date()
    } else if (date === 'tomorrow') {
      targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + 1)
    } else if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(date)) {
      targetDate = getNextDayOfWeek(date)
    } else {
      // Try to parse as date
      targetDate = new Date(date)
      if (isNaN(targetDate.getTime())) {
        return {
          response: "I'm sorry, I couldn't understand that date. Could you please provide a specific date like 'August 20' or 'tomorrow'?",
          nextStage: 'availability_check'
        }
      }
    }

    const dateString = targetDate.toISOString().split('T')[0]

    // Check actual availability for this detailer
    const existingBookings = await prisma.booking.findMany({
      where: {
        detailerId: context.detailerId,
        date: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999))
        },
        status: {
          in: ['pending', 'confirmed']
        }
      }
    })

    // Generate available time slots (9 AM to 5 PM, 2-hour slots)
    const allSlots = [
      { time: '9:00 AM', hour: 9 },
      { time: '11:00 AM', hour: 11 },
      { time: '1:00 PM', hour: 13 },
      { time: '3:00 PM', hour: 15 }
    ]

    const availableTimes = allSlots.filter(slot => {
      // Check if this time slot conflicts with existing bookings
      const slotStart = new Date(targetDate)
      slotStart.setHours(slot.hour, 0, 0, 0)
      
      return !existingBookings.some(booking => {
        const bookingTime = new Date(booking.date)
        return Math.abs(bookingTime.getHours() - slot.hour) < 2
      })
    }).map(slot => slot.time)

    if (availableTimes.length === 0) {
      return {
        response: `I'm sorry, but I don't have any available time slots on ${targetDate.toLocaleDateString()}. Would you like to check availability for a different date?`,
        nextStage: 'availability_check'
      }
    }
    
    return {
      response: `Great! I have several available time slots on ${targetDate.toLocaleDateString()}: ${availableTimes.join(', ')}. 

Which time works best for you? Once you choose a time, I'll help you complete the booking.`,
      nextStage: 'booking_confirmation',
      data: { date: dateString, availableTimes }
    }
    
  } catch (error) {
    console.error('Availability check error:', error)
    return {
      response: "I'm having trouble checking our availability right now. Please try again or contact us directly.",
      nextStage: 'availability_check'
    }
  }
}

async function handleBookingConfirmation(message: string, context: any) {
  try {
    // Extract time preference
    const timeMatch = message.match(/(\d{1,2}:\d{2}\s*(am|pm)?|morning|afternoon|evening)/i)
    
    if (!timeMatch) {
      return {
        response: "Please let me know which time slot works best for you from the available times I mentioned.",
        nextStage: 'booking_confirmation'
      }
    }

    // Get contact and detailer information
    const contact = await prisma.contact.findUnique({ where: { id: context.contactId } })
    const detailer = await prisma.detailer.findUnique({ where: { id: context.detailerId } })

    // Create booking using the existing Booking model (not Job)
    const bookingData = {
      detailerId: context.detailerId,
      userId: context.contactId, // Using contact as user for now
      date: new Date(context.data?.date || new Date()),
      status: 'pending',
      price: 150.00, // Default price, could be calculated based on service
    }

    const booking = await prisma.booking.create({
      data: bookingData
    })

    return {
      response: `Perfect! Your booking has been confirmed with ${detailer?.businessName || 'our detailer'}.

Booking Details:
- Detailer: ${detailer?.businessName || 'Professional Detailer'}
- Date: ${bookingData.date.toLocaleDateString()}
- Time: ${timeMatch[0]}
- Booking ID: ${booking.id}
- Price: $${bookingData.price}

You'll receive a confirmation and we'll send you a reminder 24 hours before your appointment.

Is there anything else I can help you with today?`,
      nextStage: 'booking_complete',
      data: { bookingId: booking.id }
    }
    
  } catch (error) {
    console.error('Booking confirmation error:', error)
    return {
      response: "I'm having trouble completing your booking right now. Please try again or contact us directly.",
      nextStage: 'booking_confirmation'
    }
  }
}

async function handleBookingComplete(message: string, openai: OpenAI, history: any[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `The customer's booking has been completed. Be helpful and ask if there's anything else you can assist them with. Keep responses brief and friendly.`
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 100
  })
  
  return {
    response: completion.choices[0].message.content || "Is there anything else I can help you with today?",
    nextStage: 'greeting'
  }
}

async function handleDefaultResponse(message: string, openai: OpenAI, history: any[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a professional car detailing concierge. Be helpful, friendly, and professional. If someone wants to book an appointment, guide them through the process.`
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 150
  })

    return {
    response: completion.choices[0].message.content || "I'm sorry, I didn't understand that. Could you please rephrase?",
    nextStage: 'greeting'
  }
}

function getNextDayOfWeek(dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const targetDay = days.indexOf(dayName.toLowerCase())
  const today = new Date()
  const currentDay = today.getDay()
  
  let daysUntilTarget = targetDay - currentDay
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7 // Next week
  }
  
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + daysUntilTarget)
  return targetDate
}
