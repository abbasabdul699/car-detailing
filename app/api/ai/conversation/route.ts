import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

type BusinessHours = Record<string, unknown> | null;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function coerceHourRanges(dayHours: unknown): string[] {
  if (!Array.isArray(dayHours) || dayHours.length === 0) {
    return [];
  }

  const looksNested = Array.isArray(dayHours[0]);
  const ranges = looksNested ? (dayHours as unknown[][]) : [dayHours as unknown[]];

  return ranges
    .map(range => Array.isArray(range) ? range.filter(v => typeof v === 'string') as string[] : [])
    .filter(range => range.length >= 2)
    .map(range => `${range[0]}-${range[1]}`);
}

function getDayHours(businessHours: BusinessHours, dayKey: string): unknown {
  if (!businessHours || typeof businessHours !== 'object') {
    return null;
  }

  return (businessHours as Record<string, unknown>)[dayKey];
}

function formatBusinessHoursSummary(businessHours: BusinessHours): string {
  if (!businessHours || typeof businessHours !== 'object') {
    return 'Business hours not provided.';
  }

  const lines = DAY_KEYS.map((dayKey, idx) => {
    const ranges = coerceHourRanges(getDayHours(businessHours, dayKey));
    if (!ranges.length) {
      return `${DAY_LABELS[idx]}: Closed`;
    }
    return `${DAY_LABELS[idx]}: ${ranges.join(', ')}`;
  });

  return lines.join('\n');
}

interface BookingSummary {
  scheduledDate: Date;
  scheduledTime: string | null;
  services: string[];
}

function formatUpcomingBookings(bookings: BookingSummary[]): string {
  if (!bookings.length) {
    return 'No upcoming bookings on the calendar.';
  }

  return bookings
    .slice(0, 5)
    .map(booking => {
      const dateLabel = booking.scheduledDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timeLabel = booking.scheduledTime
        ? booking.scheduledTime
        : booking.scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const serviceLabel = booking.services?.length
        ? booking.services.join(', ')
        : 'Service not specified';
      return `${dateLabel} at ${timeLabel} — ${serviceLabel}`;
    })
    .join('\n');
}

function formatAvailabilitySummary(businessHours: BusinessHours, bookings: BookingSummary[]): string {
  if (!businessHours || typeof businessHours !== 'object') {
    return 'Ask for a preferred date and time, then confirm manually.';
  }

  const now = new Date();
  const summaries: string[] = [];

  for (let offset = 0; offset < 5; offset += 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(now.getDate() + offset);

    const dayKey = DAY_KEYS[day.getDay() === 0 ? 6 : day.getDay() - 1];
    const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const ranges = coerceHourRanges(getDayHours(businessHours, dayKey));
    if (!ranges.length) {
      summaries.push(`${dayLabel}: Closed`);
      continue;
    }

    const dayBookings = bookings.filter(booking => {
      const bookingDate = booking.scheduledDate;
      return (
        bookingDate.getFullYear() === day.getFullYear() &&
        bookingDate.getMonth() === day.getMonth() &&
        bookingDate.getDate() === day.getDate()
      );
    });
    const bookingTimes = dayBookings.map(booking => (
      booking.scheduledTime
        ? booking.scheduledTime
        : booking.scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    ));

    const bookingLabel = bookingTimes.length ? `Booked: ${bookingTimes.join(', ')}` : 'No bookings yet';
    summaries.push(`${dayLabel}: ${ranges.join(', ')} (${bookingLabel})`);
  }

  return summaries.slice(0, 3).join('\n');
}

function buildSystemPrompt(detailerInfo: any, context: {
  businessHours: string;
  availability: string;
  bookings: string;
}): string {
  const servicesList = detailerInfo.services?.map((s: any) => s.service?.name).filter(Boolean) || [];
  const serviceText = servicesList.length ? servicesList.join(', ') : 'Various car detailing services';

  return `You are an AI assistant for ${detailerInfo.businessName}, a car detailing service operating in ${detailerInfo.city}, ${detailerInfo.state}.

Business Hours:
${context.businessHours}

Current Availability:
${context.availability}

Upcoming Bookings:
${context.bookings}

Services you can offer: ${serviceText}

Capabilities:
1. Help customers book appointments without double-booking existing slots.
2. Answer questions about services, pricing, and preparation.
3. Collect all required booking details (date, time, vehicle type/model/year, services requested, service location, contact information).

When working on a booking:
- Only propose times within business hours that are not already booked.
- Confirm the customer’s preferred date and time and verify availability.
- Ask follow-up questions one at a time and keep responses concise, friendly, and professional.
- Summarize the booking details back to the customer before finalizing.`;
}
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper function to call OpenAI API
async function getAIResponse(messages: any[], systemPrompt: string, conversationHistory: any[] = []) {
  try {
    const conversationContext = conversationHistory.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    const currentMessage = messages[messages.length - 1];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationContext,
          { role: 'user', content: currentMessage.content }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request. Please try again.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
  }
}

// Helper function to extract booking information from messages
function extractBookingInfo(messages: any[]) {
  const recentMessages = messages.slice(-10); // Look at last 10 messages
  const text = recentMessages.map(msg => msg.content).join(' ');
  
  // Simple keyword detection for booking intent
  const bookingKeywords = ['book', 'schedule', 'appointment', 'available', 'time', 'date', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const serviceKeywords = ['wash', 'detail', 'cleaning', 'interior', 'exterior', 'full detail', 'wax', 'polish'];
  
  const hasBookingIntent = bookingKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const hasServiceIntent = serviceKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  return {
    isBookingRequest: hasBookingIntent || hasServiceIntent,
    extractedServices: serviceKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ),
    extractedDate: extractDateFromText(text),
    extractedTime: extractTimeFromText(text)
  };
}

// Helper function to extract date from text
function extractDateFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  const today = new Date();
  
  // Check for relative dates
  if (lowerText.includes('today')) return today.toISOString().split('T')[0];
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Check for day names (next occurrence)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) {
    if (lowerText.includes(day)) {
      const dayIndex = days.indexOf(day);
      const nextDay = new Date(today);
      const currentDayIndex = today.getDay() === 0 ? 7 : today.getDay(); // Sunday = 7
      const daysUntil = (dayIndex + 1) - currentDayIndex;
      nextDay.setDate(nextDay.getDate() + (daysUntil <= 0 ? daysUntil + 7 : daysUntil));
      return nextDay.toISOString().split('T')[0];
    }
  }
  
  return null;
}

// Helper function to extract time from text
function extractTimeFromText(text: string): string | null {
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/;
  const match = text.match(timeRegex);
  
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message } = body;

    if (!conversationId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get conversation with detailer info
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        detailer: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20 // Last 20 messages for context
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const upcomingBookingsRaw = await prisma.booking.findMany({
      where: {
        detailerId: conversation.detailerId,
        scheduledDate: { gte: new Date() },
        status: { in: ['pending', 'confirmed'] },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    const normalizedBookings: BookingSummary[] = upcomingBookingsRaw.map(booking => ({
      scheduledDate: booking.scheduledDate instanceof Date ? booking.scheduledDate : new Date(booking.scheduledDate),
      scheduledTime: booking.scheduledTime ?? null,
      services: booking.services ?? [],
    }));

    const systemPrompt = buildSystemPrompt(conversation.detailer, {
      businessHours: formatBusinessHoursSummary(conversation.detailer.businessHours as BusinessHours),
      availability: formatAvailabilitySummary(conversation.detailer.businessHours as BusinessHours, normalizedBookings),
      bookings: formatUpcomingBookings(normalizedBookings),
    });

    // Store the incoming message
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        direction: 'inbound',
        content: message,
        status: 'received',
      }
    });

    // Get updated messages for AI processing
    const updatedMessages = [...conversation.messages, newMessage];

    // Get AI response
    const aiResponse = await getAIResponse(updatedMessages, systemPrompt, conversation.messages);

    // Store the AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        content: aiResponse,
        status: 'sent',
      }
    });

    // Send SMS response via Twilio
    await client.messages.create({
      to: conversation.customerPhone,
      from: conversation.detailer.twilioPhoneNumber,
      body: aiResponse
    });

    // Check if this is a booking request and extract information
    const bookingInfo = extractBookingInfo(updatedMessages);
    
    if (bookingInfo.isBookingRequest && bookingInfo.extractedDate) {
      // Create a pending booking
      const booking = await prisma.booking.create({
        data: {
          detailerId: conversation.detailerId,
          conversationId,
          customerPhone: conversation.customerPhone,
          scheduledDate: new Date(bookingInfo.extractedDate),
          scheduledTime: bookingInfo.extractedTime,
          services: bookingInfo.extractedServices,
          status: 'pending',
          notes: `AI booking request from SMS conversation`
        }
      });

      console.log('Booking created:', booking.id);
    }

    return NextResponse.json({ 
      success: true,
      aiResponse,
      messageId: aiMessage.id,
      bookingCreated: bookingInfo.isBookingRequest
    });

  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
