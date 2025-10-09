/**
 * Conversation state machine to prevent spam and manage booking flow
 * Implements the state machine pattern for SMS conversations
 */

import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export type ConversationState = 
  | 'idle' 
  | 'awaiting_date' 
  | 'awaiting_time' 
  | 'awaiting_confirm' 
  | 'confirmed' 
  | 'error';

export interface ConversationContext {
  state: ConversationState;
  detailerId: string;
  customerPhone: string;
  messageSid: string;
  slots?: Array<{ startLocal: string; startISO?: string; label?: string; endLocal?: string; startUtcISO?: string; endUtcISO?: string }>;
  selectedSlot?: { startLocal: string; startISO?: string; label?: string; endLocal?: string; startUtcISO?: string; endUtcISO?: string };
  lastMessageTime: Date;
  attempts: number;
  metadata?: Record<string, any>;
}

/**
 * Get or create conversation context
 */
export async function getConversationContext(
  detailerId: string,
  customerPhone: string,
  messageSid: string
): Promise<ConversationContext> {
  try {
    // Try to find existing conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        detailerId,
        customerPhone,
        // Only get recent conversations (within last 24 hours)
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (conversation) {
      // Parse existing state from conversation metadata
      const metadata = conversation.metadata as any || {};
      return {
        state: metadata.state || 'idle',
        detailerId,
        customerPhone,
        messageSid,
        slots: metadata.slots || [],
        selectedSlot: metadata.selectedSlot || undefined,
        lastMessageTime: conversation.updatedAt,
        attempts: metadata.attempts || 0,
        metadata: metadata
      };
    }

    // Create new conversation context
    return {
      state: 'idle',
      detailerId,
      customerPhone,
      messageSid,
      lastMessageTime: new Date(),
      attempts: 0,
      metadata: {}
    };

  } catch (error) {
    console.error('Error getting conversation context:', error);
    // Return default context on error
    return {
      state: 'idle',
      detailerId,
      customerPhone,
      messageSid,
      lastMessageTime: new Date(),
      attempts: 0,
      metadata: {}
    };
  }
}

/**
 * Update conversation context and save to database
 */
export async function updateConversationContext(
  context: ConversationContext,
  newState?: ConversationState,
  updates?: Partial<ConversationContext>
): Promise<ConversationContext> {
  try {
    const updatedContext = {
      ...context,
      ...updates,
      ...(newState && { state: newState }),
      lastMessageTime: new Date(),
      attempts: context.attempts + 1
    };

    // Save to database
    await prisma.conversation.upsert({
      where: {
        detailerId_customerPhone: {
          detailerId: context.detailerId,
          customerPhone: context.customerPhone
        }
      },
      update: {
        updatedAt: new Date(),
        metadata: {
          state: updatedContext.state,
          slots: updatedContext.slots,
          selectedSlot: updatedContext.selectedSlot,
          attempts: updatedContext.attempts,
          ...updatedContext.metadata
        }
      },
      create: {
        detailerId: context.detailerId,
        customerPhone: context.customerPhone,
        metadata: {
          state: updatedContext.state,
          slots: updatedContext.slots,
          selectedSlot: updatedContext.selectedSlot,
          attempts: updatedContext.attempts,
          ...updatedContext.metadata
        }
      }
    });

    return updatedContext;

  } catch (error) {
    console.error('Error updating conversation context:', error);
    return context; // Return original context on error
  }
}

/**
 * Check if we should throttle messages to prevent spam
 */
export function shouldThrottle(
  context: ConversationContext,
  messageType: 'availability' | 'confirmation' | 'general'
): boolean {
  const now = new Date();
  const timeSinceLastMessage = now.getTime() - context.lastMessageTime.getTime();
  
  // Don't send availability lists more than once every 5 minutes
  if (messageType === 'availability') {
    const lastAvailabilityTime = context.metadata?.lastAvailabilityTime;
    if (lastAvailabilityTime) {
      const timeSinceLastAvailability = now.getTime() - new Date(lastAvailabilityTime).getTime();
      if (timeSinceLastAvailability < 5 * 60 * 1000) { // 5 minutes
        console.log('Throttling availability message - too soon since last one');
        return true;
      }
    }
  }
  
  // Don't send more than 10 messages in 1 hour
  if (context.attempts > 10 && timeSinceLastMessage < 60 * 60 * 1000) {
    console.log('Throttling message - too many attempts in short time');
    return true;
  }
  
  return false;
}

/**
 * Check if message is a duplicate (same MessageSid)
 */
export async function isDuplicateMessage(messageSid: string): Promise<boolean> {
  try {
    const existingMessage = await prisma.message.findFirst({
      where: { twilioSid: messageSid }
    });
    
    return !!existingMessage;
  } catch (error) {
    console.error('Error checking duplicate message:', error);
    return false; // Assume not duplicate on error
  }
}

/**
 * Process conversation state and return appropriate response
 */
export async function processConversationState(
  context: ConversationContext,
  userMessage: string,
  detailerServices: any[],
  availableSlots?: Array<{ startLocal: string; startISO?: string; label?: string; endLocal?: string; startUtcISO?: string; endUtcISO?: string }>
): Promise<{
  response: string;
  newContext: ConversationContext;
  shouldSend: boolean;
}> {
  let response = '';
  let newContext = { ...context };
  let shouldSend = true;

  switch (context.state) {
    case 'idle':
      // Check if user is selecting a specific date and time (e.g., "Oct 9 at 3 PM", "let's do October 10th at 9:30 AM")
      const dateTimeSelectionMatch = userMessage.match(/(?:let'?s?\s+do|ok,?\s+let'?s?\s+do|i'?ll\s+take|book|schedule)\s+(october|november|december|january|february|march|april|may|june|july|august|september|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      
      if (dateTimeSelectionMatch) {
        // User is selecting a specific date and time for booking
        try {
          const [, month, day, hour, minute = '00', period] = dateTimeSelectionMatch;
          const currentYear = new Date().getFullYear();
          
          // Handle abbreviated month names
          const monthMap: { [key: string]: number } = {
            'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
            'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
            'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
            'nov': 10, 'november': 10, 'dec': 11, 'december': 11
          };
          
          const monthIndex = monthMap[month.toLowerCase()];
          if (monthIndex === undefined) {
            throw new Error(`Invalid month: ${month}`);
          }
          
          const requestedDate = new Date(currentYear, monthIndex, parseInt(day));
          
          // Parse time
          let hour24 = parseInt(hour);
          if (period?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
          if (period?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
          
          const requestedTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
          const dateStr = requestedDate.toISOString().split('T')[0];
          
          // Check availability for this specific time
          const { getMergedFreeSlots } = await import('./slotComputationV2');
          
          // Fetch existing bookings for this date
          const existingBookings = await prisma.booking.findMany({
            where: {
              detailerId: context.detailerId,
              status: { in: ['confirmed', 'pending'] },
              scheduledDate: {
                gte: new Date(requestedDate.toISOString().split('T')[0] + 'T00:00:00.000Z'),
                lt: new Date(requestedDate.toISOString().split('T')[0] + 'T23:59:59.999Z')
              }
            },
            select: {
              scheduledDate: true,
              scheduledTime: true,
              duration: true
            }
          });

          // Convert bookings to the format expected by getMergedFreeSlots
          const reevaBookings = existingBookings.map(booking => {
            const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
            const startTime = booking.scheduledTime || '10:00';
            const duration = booking.duration || 240;
            
            const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: 'America/New_York' });
            const end = start.plus({ minutes: duration });
            
            return {
              start: start.toUTC().toISO(),
              end: end.toUTC().toISO()
            };
          });
          
          const slots = await getMergedFreeSlots(
            dateStr,
            'primary',
            reevaBookings,
            context.detailerId,
            120,
            30,
            'America/New_York'
          );
          
          // Check if the requested time is available
          const isAvailable = slots.some(slot => {
            const slotTime = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
            if (!slotTime) return false;
            
            const slotHour = slotTime[1];
            const requestedTime12 = `${hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`;
            
            return slotHour === requestedTime12;
          });
          
          console.log(`🔍 DEBUG: Date/time selection - ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} - Available: ${isAvailable}`);
          
          if (isAvailable) {
            response = `Perfect! I have ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} available. Please confirm by replying 'yes' or 'confirm' to book this appointment.`;
            
            // Create a mock slot for the selected time
            const selectedSlot = {
              startLocal: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
              startISO: `${dateStr}T${requestedTime}:00.000Z`,
              label: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`
            };
            
            newContext = await updateConversationContext(context, 'awaiting_confirm', {
              selectedSlot,
              metadata: { 
                ...context.metadata, 
                selectedDate: dateStr,
                selectedTime: requestedTime
              }
            });
          } else {
            // Find available times for that day
            const availableTimes = slots.slice(0, 4).map(slot => {
              const timeMatch = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
              return timeMatch ? timeMatch[1] : 'time';
            }).join(', ');
            
            if (availableTimes) {
              response = `Sorry, ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is not available. Here are the available times for ${month} ${day}: ${availableTimes}. Which time works for you?`;
            } else {
              response = `Sorry, ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is not available. That day is fully booked. What other date works for you?`;
            }
            newContext = await updateConversationContext(context, 'awaiting_time');
          }
        } catch (error) {
          console.error('Error processing date/time selection:', error);
          response = "I had trouble processing that date and time. What date works for you? (We're open Mon–Fri 8a–6p)";
          newContext = await updateConversationContext(context, 'awaiting_date');
        }
      } else {
        // Check if user is asking for specific time availability (e.g., "Is October 10th at 9:30 AM available?")
        const specificTimeMatch = userMessage.match(/(?:is\s+)?(october|november|december|january|february|march|april|may|june|july|august|september)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?\s+(?:available\??)/i);
      
      if (specificTimeMatch) {
        // User is asking about a specific time availability
        try {
          const [, month, day, hour, minute = '00', period] = specificTimeMatch;
          const currentYear = new Date().getFullYear();
          const monthIndex = new Date(`${month} 1, ${currentYear}`).getMonth();
          const requestedDate = new Date(currentYear, monthIndex, parseInt(day));
          
          // Parse time
          let hour24 = parseInt(hour);
          if (period?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
          if (period?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
          
          const requestedTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
          const dateStr = requestedDate.toISOString().split('T')[0];
          
          // Check availability for this specific time
          const { getMergedFreeSlots } = await import('./slotComputationV2');
          
          // Fetch existing bookings for this date to pass to getMergedFreeSlots
          const existingBookings = await prisma.booking.findMany({
            where: {
              detailerId: context.detailerId,
              status: { in: ['confirmed', 'pending'] },
              scheduledDate: {
                gte: new Date(requestedDate.toISOString().split('T')[0] + 'T00:00:00.000Z'),
                lt: new Date(requestedDate.toISOString().split('T')[0] + 'T23:59:59.999Z')
              }
            },
            select: {
              scheduledDate: true,
              scheduledTime: true,
              duration: true
            }
          });

          // Convert bookings to the format expected by getMergedFreeSlots
          const reevaBookings = existingBookings.map(booking => {
            const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
            const startTime = booking.scheduledTime || '10:00';
            const duration = booking.duration || 240;
            
            const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: 'America/New_York' });
            const end = start.plus({ minutes: duration });
            
            return {
              start: start.toUTC().toISO(),
              end: end.toUTC().toISO()
            };
          });

          console.log(`🔍 DEBUG: Found ${reevaBookings.length} existing bookings for ${dateStr}`);
          
          const slots = await getMergedFreeSlots(
            dateStr,
            'primary',
            reevaBookings,
            context.detailerId,
            240, // 4 hour service
            30,
            'America/New_York'
          );
          
          // Check if the requested time is available
          console.log(`🔍 DEBUG: Checking availability for ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`);
          console.log(`🔍 DEBUG: Parsed time - hour24: ${hour24}, minute: ${minute}`);
          console.log(`🔍 DEBUG: Available slots:`, slots.map(slot => slot.label));
          
          const isAvailable = slots.some(slot => {
            const slotTimeMatch = slot.label.match(/(\d{1,2}):(\d{2}) (AM|PM)/);
            if (slotTimeMatch) {
              const [, slotHour, slotMin, slotPeriod] = slotTimeMatch;
              let slotHour24 = parseInt(slotHour);
              if (slotPeriod === 'PM' && slotHour24 !== 12) slotHour24 += 12;
              if (slotPeriod === 'AM' && slotHour24 === 12) slotHour24 = 0;
              
              const matches = slotHour24 === hour24 && slotMin === minute;
              console.log(`🔍 DEBUG: Slot ${slot.label} -> hour24: ${slotHour24}, minute: ${slotMin} -> matches: ${matches}`);
              return matches;
            }
            return false;
          });
          
          console.log(`🔍 DEBUG: Final availability result: ${isAvailable}`);
          
          if (isAvailable) {
            response = `Yes! ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is available. Would you like to book that time?`;
            newContext = await updateConversationContext(context, 'awaiting_confirm');
          } else {
            // Find available times for that day
            const availableTimes = slots.slice(0, 4).map(slot => {
              const timeMatch = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
              return timeMatch ? timeMatch[1] : 'time';
            }).join(', ');
            
            if (availableTimes) {
              response = `No, ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is not available. Here are the available times for ${month} ${day}: ${availableTimes}. Which time works for you?`;
            } else {
              response = `No, ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is not available. That day is fully booked. What other date works for you?`;
            }
            newContext = await updateConversationContext(context, 'awaiting_time');
          }
        } catch (error) {
          console.error('Error checking specific time availability:', error);
          response = "I had trouble checking that specific time. What date works for you? (We're open Mon–Fri 8a–6p)";
          newContext = await updateConversationContext(context, 'awaiting_date');
        }
      } else if (/available|times?|slots?|openings?|schedule/i.test(userMessage)) {
        // Check if user is asking for available times
        // Provide actual available times for next few days
        try {
          const { getMergedFreeSlots } = await import('./slotComputationV2');
          const today = new Date();
          const availableSlots = [];
          
          // Get slots for next 3 days
          for (let i = 1; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Fetch existing bookings for this date
            const existingBookings = await prisma.booking.findMany({
              where: {
                detailerId: context.detailerId,
                status: { in: ['confirmed', 'pending'] },
                scheduledDate: {
                  gte: new Date(dateStr + 'T00:00:00.000Z'),
                  lt: new Date(dateStr + 'T23:59:59.999Z')
                }
              },
              select: {
                scheduledDate: true,
                scheduledTime: true,
                duration: true
              }
            });

            // Convert bookings to the format expected by getMergedFreeSlots
            const reevaBookings = existingBookings.map(booking => {
              const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
              const startTime = booking.scheduledTime || '10:00';
              const duration = booking.duration || 240;
              
              const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: 'America/New_York' });
              const end = start.plus({ minutes: duration });
              
              return {
                start: start.toUTC().toISO(),
                end: end.toUTC().toISO()
              };
            });
            
            const slots = await getMergedFreeSlots(
              dateStr,
              'primary', // Use primary calendar for now
              reevaBookings,
              context.detailerId,
              120, // 2 hour service
              30, // 30 minute steps
              'America/New_York'
            );
            
            if (slots.length > 0) {
              const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
              const daySlots = slots.slice(0, 4).map(slot => {
                // Extract time from label like "Wed, Oct 8: 8:00 AM – 10:00 AM"
                const timeMatch = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
                return timeMatch ? timeMatch[1] : slot.label.split(': ')[1]?.split(' –')[0] || 'time';
              }).join(', ');
              
              availableSlots.push(`${dayName}: ${daySlots}`);
            }
          }
          
          if (availableSlots.length > 0) {
            // Check if Google Calendar is connected for this detailer
            const { prisma } = await import('@/lib/prisma');
            const detailer = await prisma.detailer.findUnique({
              where: { id: context.detailerId },
              select: { googleCalendarConnected: true, googleCalendarTokens: true }
            });
            
            const calendarWarning = (!detailer?.googleCalendarConnected || !detailer?.googleCalendarTokens) 
              ? "\n\n⚠️ Note: My calendar sync is temporarily unavailable, so please confirm your preferred time is still open."
              : "";
            
            response = `Here are our available times:\n\n${availableSlots.join('\n')}${calendarWarning}\n\nWhich day and time works for you?`;
            newContext = await updateConversationContext(context, 'awaiting_time');
          } else {
            response = "I don't see any available slots in the next few days. What date works for you? (We're open Mon–Fri 8a–6p)";
            newContext = await updateConversationContext(context, 'awaiting_date');
          }
        } catch (error) {
          console.error('Error getting availability:', error);
          response = "What date works for you? (We're open Mon–Fri 8a–6p)";
          newContext = await updateConversationContext(context, 'awaiting_date');
        }
      } else {
        response = "What date works for you? (We're open Mon–Fri 8a–6p)";
        newContext = await updateConversationContext(context, 'awaiting_date');
      }
      }
      break;

    case 'awaiting_date':
      try {
        // Parse date from user message
        const { parseDateV2 } = await import('./timeUtilsV2');
        const parsedDate = parseDateV2(userMessage, 'America/New_York');
        const dateStr = parsedDate.toFormat('yyyy-MM-dd');
        
        // Get available slots for this date
        const { getMergedFreeSlots } = await import('./slotComputationV2');
        
        // Get detailer's calendar ID
        const detailer = await prisma.detailer.findUnique({
          where: { id: context.detailerId },
          select: { googleCalendarId: true }
        });
        
        const calendarId = detailer?.googleCalendarId || 'primary';
        
        // Fetch existing bookings for this date
        const existingBookings = await prisma.booking.findMany({
          where: {
            detailerId: context.detailerId,
            status: { in: ['confirmed', 'pending'] },
            scheduledDate: {
              gte: new Date(dateStr + 'T00:00:00.000Z'),
              lt: new Date(dateStr + 'T23:59:59.999Z')
            }
          },
          select: {
            scheduledDate: true,
            scheduledTime: true,
            duration: true
          }
        });

        // Convert bookings to the format expected by getMergedFreeSlots
        const reevaBookings = existingBookings.map(booking => {
          const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
          const startTime = booking.scheduledTime || '10:00';
          const duration = booking.duration || 240;
          
          const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: 'America/New_York' });
          const end = start.plus({ minutes: duration });
          
          return {
            start: start.toUTC().toISO(),
            end: end.toUTC().toISO()
          };
        });
        
        const slots = await getMergedFreeSlots(
          dateStr,
          calendarId,
          reevaBookings,
          context.detailerId,
          240, // 4 hours for full detail
          30,  // 30-minute steps
          'America/New_York'
        );
        
        if (slots.length === 0) {
          response = "That day is full. Try Tue–Thu?";
          newContext = await updateConversationContext(context, 'awaiting_date');
        } else {
          // Limit to 6 options to avoid overwhelming
          const limitedSlots = slots.slice(0, 6).map(slot => ({
            startLocal: slot.startLocal,
            startISO: slot.startISO,
            label: slot.label
          }));
          
          response = `Available times for ${parsedDate.toFormat('cccc, LLL d')}:\n\n`;
          response += limitedSlots.map((slot, i) => 
            `${i + 1}. ${slot.label}`
          ).join('\n');
          response += '\n\nPlease pick one of the times above.';
          
          newContext = await updateConversationContext(context, 'awaiting_time', {
            slots: limitedSlots,
            metadata: { 
              ...context.metadata, 
              lastAvailabilityTime: new Date().toISOString(),
              selectedDate: dateStr
            }
          });
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        response = "I didn't understand that date. Please try again (e.g., 'tomorrow', 'Friday', or '10/15')";
        newContext = await updateConversationContext(context, 'awaiting_date');
      }
      break;

    case 'awaiting_time':
      try {
        console.log('🔍 DEBUG: Time selection - User message:', userMessage);
        console.log('🔍 DEBUG: Available slots from context:', context.slots);
        console.log('🔍 DEBUG: Available slots from parameter:', availableSlots);
        
        // Use passed availableSlots if available, otherwise fall back to context.slots
        const slotsToUse = availableSlots || context.slots || [];
        console.log('🔍 DEBUG: Using slots:', slotsToUse);
        
        // Parse slot selection from user message
        const selectedSlot = pickSlotFromMessage(userMessage, slotsToUse);
        
        console.log('🔍 DEBUG: Selected slot:', selectedSlot);
        
        if (!selectedSlot) {
          response = "Please pick one of the shown times by number (1, 2, 3, etc.)";
          newContext = await updateConversationContext(context, 'awaiting_time');
        } else {
          response = `Great! I have you down for ${selectedSlot.label}.\n\nPlease confirm by replying 'yes' or 'confirm' to book this appointment.`;
          
          newContext = await updateConversationContext(context, 'awaiting_confirm', {
            selectedSlot
          });
        }
      } catch (error) {
        console.error('Error parsing time selection:', error);
        response = "Please pick one of the shown times by number (1, 2, 3, etc.)";
        newContext = await updateConversationContext(context, 'awaiting_time');
      }
      break;

    case 'awaiting_confirm':
      if (userConfirmed(userMessage)) {
        // Attempt to create booking
        try {
          const { createBookingWithRetry } = await import('./bookingClient');
          
          const bookingRequest = {
            detailerId: context.detailerId,
            date: context.metadata?.selectedDate || new Date().toISOString().split('T')[0],
            time: context.selectedSlot?.startLocal || '10:00 AM',
            durationMinutes: 240,
            tz: 'America/New_York',
            title: `Customer - Full Detail`,
            customerPhone: context.customerPhone,
            source: 'AI'
          };
          
          const idempotencyKey = `${context.detailerId}:${context.customerPhone}:${context.messageSid}`;
          const bookingResult = await createBookingWithRetry(bookingRequest, idempotencyKey);
          
          if (bookingResult.ok) {
            response = "Booked! 📅 Your appointment is confirmed. We'll send you a reminder closer to your appointment time.";
            newContext = await updateConversationContext(context, 'confirmed');
          } else {
            response = `Hit a snag creating the booking. ${bookingResult.message || 'Please try "confirm" again in a moment or text HELP.'}`;
            newContext = await updateConversationContext(context, 'awaiting_confirm');
          }
        } catch (error) {
          console.error('Error creating booking:', error);
          response = "I'm having trouble creating your appointment right now. Please try again in a moment, or contact us directly for assistance.";
          newContext = await updateConversationContext(context, 'error');
        }
      } else {
        response = "No problem — pick another time above.";
        newContext = await updateConversationContext(context, 'awaiting_time');
      }
      break;

    case 'confirmed':
      response = "Your appointment is already confirmed! If you need to make changes, please contact us directly.";
      shouldSend = false; // Don't send unnecessary messages
      break;

    case 'error':
      response = "I'm having some technical difficulties. Please contact us directly for assistance.";
      newContext = await updateConversationContext(context, 'idle');
      break;

    default:
      response = "I didn't understand that. Please start over by telling me what date works for you.";
      newContext = await updateConversationContext(context, 'awaiting_date');
  }

  // Check if we should throttle this response
  if (shouldThrottle(newContext, 'general')) {
    shouldSend = false;
    response = "Please wait a moment before sending another message.";
  }

  return { response, newContext, shouldSend };
}

/**
 * Pick a slot from user message
 */
function pickSlotFromMessage(
  userMessage: string,
  slots: Array<{ startLocal: string; startISO?: string; label?: string; endLocal?: string; startUtcISO?: string; endUtcISO?: string }>
): { startLocal: string; startISO?: string; label?: string; endLocal?: string; startUtcISO?: string; endUtcISO?: string } | null {
  const message = userMessage.trim().toLowerCase();
  
  // Check for number selection (1, 2, 3, etc.)
  const numberMatch = message.match(/^(\d+)$/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1]) - 1;
    if (index >= 0 && index < slots.length) {
      return slots[index];
    }
  }
  
  // Check for time mentioned in message - improved matching
  for (const slot of slots) {
    const slotTime = slot.startLocal.toLowerCase();
    
    // Direct time format matching (e.g., "9:00 AM")
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
    if (timeMatch) {
      const [, hour, minute = '00', period] = timeMatch;
      const normalizedTime = `${hour}:${minute} ${period}`;
      
      // Check if this time appears in the slot
      if (slotTime.includes(normalizedTime) || slotTime.includes(`${hour}:${minute} ${period}`)) {
        return slot;
      }
    }
    
    // Fallback: check if message contains any part of the slot time
    if (message.includes(slotTime)) {
      return slot;
    }
    
    // Also check the label field if it exists
    if (slot.label && message.includes(slot.label.toLowerCase())) {
      return slot;
    }
  }
  
  return null;
}

/**
 * Check if user confirmed the booking
 */
function userConfirmed(userMessage: string): boolean {
  const message = userMessage.trim().toLowerCase();
  const confirmWords = ['yes', 'confirm', 'confirmed', 'book', 'book it', 'schedule'];
  return confirmWords.some(word => message.includes(word));
}
