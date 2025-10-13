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
  | 'awaiting_choice'
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
    // Try to find existing conversation using unique constraint
    const conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId,
          customerPhone
        }
      }
    });

    if (conversation) {
      // Parse existing state from conversation metadata
      const metadata = conversation.metadata as any || {};
      
      console.log('🔍 DEBUG: Loaded conversation state from DB:', {
        conversationId: conversation.id,
        state: metadata.state || 'idle',
        hasSlots: !!metadata.slots,
        hasSelectedSlot: !!metadata.selectedSlot,
        metadata: metadata
      });
      
      return {
        state: metadata.state || 'idle',
        detailerId,
        customerPhone,
        messageSid,
        slots: metadata.slots || [],
        selectedSlot: metadata.selectedSlot || undefined,
        lastMessageTime: conversation.updatedAt || new Date(),
        attempts: metadata.attempts || 0,
        metadata: metadata
      };
    }

    // Create new conversation context
    console.log('🔍 DEBUG: No existing conversation found, creating new context');
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

    const metadataToSave = {
      state: updatedContext.state,
      slots: updatedContext.slots,
      selectedSlot: updatedContext.selectedSlot,
      attempts: updatedContext.attempts,
      ...updatedContext.metadata
    };

    console.log('🔍 DEBUG: Saving conversation state to DB:', {
      detailerId: context.detailerId,
      customerPhone: context.customerPhone,
      state: updatedContext.state,
      hasSlots: !!updatedContext.slots && updatedContext.slots.length > 0,
      hasSelectedSlot: !!updatedContext.selectedSlot,
      metadataToSave: metadataToSave
    });

    // Save to database
    const savedConversation = await prisma.conversation.upsert({
      where: {
        detailerId_customerPhone: {
          detailerId: context.detailerId,
          customerPhone: context.customerPhone
        }
      },
      update: {
        updatedAt: new Date(),
        metadata: metadataToSave
      },
      create: {
        detailerId: context.detailerId,
        customerPhone: context.customerPhone,
        status: 'active',
        lastMessageAt: new Date(),
        metadata: metadataToSave
      }
    });

    console.log('✅ DEBUG: Conversation state saved successfully:', {
      conversationId: savedConversation.id,
      state: updatedContext.state
    });

    return updatedContext;

  } catch (error) {
    console.error('❌ Error updating conversation context:', error);
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
  availableSlots?: Array<{ startLocal: string; startISO?: string; label?: string; endLocal?: string; startUtcISO?: string; endUtcISO?: string }>,
  detailerTimezone: string = 'America/New_York'
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
      const dateTimeSelectionMatch = userMessage.match(/(?:let'?s?\s+do|lets\s+do|ok,?\s+let'?s?\s+do|ok\s+lets\s+do|ok,?\s+lets\s+do|i'?ll\s+take|book|schedule)\s+(october|november|december|january|february|march|april|may|june|july|august|september|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      
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
          
          // Create date in UTC to avoid timezone issues
          const requestedDate = new Date(Date.UTC(currentYear, monthIndex, parseInt(day)));
          
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
            
            const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: detailerTimezone });
            const end = start.plus({ minutes: duration });
            
            return {
              start: start.toUTC().toISO() || '',
              end: end.toUTC().toISO() || ''
            };
          }).filter(booking => booking.start && booking.end);
          
          const slots = await getMergedFreeSlots(
            dateStr,
            'primary',
            reevaBookings,
            context.detailerId,
            120,
            30,
            detailerTimezone
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
            
            // Create a mock slot for the selected time with date field
            const selectedSlot = {
              startLocal: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
              startISO: `${dateStr}T${requestedTime}:00.000Z`,
              label: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
              date: dateStr // Add date field for booking creation
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
          const businessHours = await formatBusinessHours(context.detailerId);
          response = `I had trouble processing that date and time. What date works for you? (We're open ${businessHours})`;
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
          // Create date in UTC to avoid timezone issues
          const requestedDate = new Date(Date.UTC(currentYear, monthIndex, parseInt(day)));
          
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
            
            const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: detailerTimezone });
            const end = start.plus({ minutes: duration });
            
            return {
              start: start.toUTC().toISO() || '',
              end: end.toUTC().toISO() || ''
            };
          }).filter(booking => booking.start && booking.end);

          console.log(`🔍 DEBUG: Found ${reevaBookings.length} existing bookings for ${dateStr}`);
          
          const slots = await getMergedFreeSlots(
            dateStr,
            'primary',
            reevaBookings,
            context.detailerId,
            240, // 4 hour service
            30,
            detailerTimezone
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
            
            // Create a selectedSlot for the available time
            const selectedSlot = {
              startLocal: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
              startISO: `${dateStr}T${requestedTime}:00.000Z`,
              label: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
              date: dateStr // Add date field for booking creation
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
              response = `No, ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is not available. Here are the available times for ${month} ${day}: ${availableTimes}. Which time works for you?`;
            } else {
              response = `No, ${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''} is not available. That day is fully booked. What other date works for you?`;
            }
            newContext = await updateConversationContext(context, 'awaiting_time');
          }
        } catch (error) {
          console.error('Error checking specific time availability:', error);
          const businessHours = await formatBusinessHours(context.detailerId);
          response = `I had trouble checking that specific time. What date works for you? (We're open ${businessHours})`;
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
              
              const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: detailerTimezone });
              const end = start.plus({ minutes: duration });
              
              return {
                start: start.toUTC().toISO() || '',
                end: end.toUTC().toISO() || ''
              };
            }).filter(booking => booking.start && booking.end);
            
            const slots = await getMergedFreeSlots(
              dateStr,
              'primary', // Use primary calendar for now
              reevaBookings,
              context.detailerId,
              120, // 2 hour service
              30, // 30 minute steps
              detailerTimezone
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
            
            response = `Here's what I've got open:\n\n${availableSlots.join('\n')}${calendarWarning}\n\nWhich day and time works best for you?`;
            newContext = await updateConversationContext(context, 'awaiting_time');
          } else {
            const businessHours = await formatBusinessHours(context.detailerId);
            response = `Hmm, looks like we're pretty booked up for the next few days. What date works for you? (We're open ${businessHours})`;
            newContext = await updateConversationContext(context, 'awaiting_date');
          }
        } catch (error) {
          console.error('Error getting availability:', error);
          const businessHours = await formatBusinessHours(context.detailerId);
          response = `What date works for you? (We're open ${businessHours})`;
          newContext = await updateConversationContext(context, 'awaiting_date');
        }
      } else if (userConfirmed(userMessage)) {
        // User is trying to confirm something but we're in idle state
        // This usually means they're responding to a previous message that got lost
        const businessHours = await formatBusinessHours(context.detailerId);
        response = `I don't have a specific appointment ready to confirm. What date works for you? (We're open ${businessHours})`;
        newContext = await updateConversationContext(context, 'awaiting_date');
      } else {
        const businessHours = await formatBusinessHours(context.detailerId);
        response = `What date works for you? (We're open ${businessHours})`;
        newContext = await updateConversationContext(context, 'awaiting_date');
      }
      }
      break;

    case 'awaiting_date':
      try {
        console.log('🔍 DEBUG: In awaiting_date case, userMessage:', userMessage);
        
        // FIRST: Check if user is asking for general availability (e.g., "What are your available times?", "Do you have any openings?")
        // This should take priority over service requests to avoid false positives
        console.log('🔍 DEBUG: About to check general availability pattern for:', userMessage);
        const generalAvailabilityQueryMatch = userMessage.match(/(?:what\s+are.*available\s+(?:times|dates|appointments)|available\s+(?:times|dates|appointments)|do\s+you\s+have\s+any\s+openings|show\s+me\s+your\s+availability|what\s+(?:times|dates)\s+do\s+you\s+have|when\s+are\s+you\s+available|yeah\s+what\s+are.*available|what\s+services\s+do\s+you\s+provide)/i);
        console.log('🔍 DEBUG: General availability pattern match result:', generalAvailabilityQueryMatch);
        
        if (generalAvailabilityQueryMatch) {
          console.log('🔍 DEBUG: General availability query detected:', userMessage);
          
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
              
              // Get Google Calendar events for this date
              const existingEvents = await prisma.event.findMany({
                where: {
                  detailerId: context.detailerId,
                  date: {
                    gte: new Date(dateStr + 'T00:00:00.000Z'),
                    lt: new Date(dateStr + 'T23:59:59.999Z')
                  }
                },
                select: {
                  date: true,
                  time: true,
                  title: true
                }
              });
              
              // Convert bookings to the format expected by getMergedFreeSlots
              const reevaBookings = existingBookings.map(booking => {
                const bookingDate = booking.scheduledDate.toISOString().split('T')[0];
                const startTime = booking.scheduledTime || '10:00';
                const duration = booking.duration || 240;
                
                const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: detailerTimezone });
                const end = start.plus({ minutes: duration });
                
                return {
                  start: start.toUTC().toISO() || '',
                  end: end.toUTC().toISO() || ''
                };
              }).filter(booking => booking.start && booking.end);

              // Get available slots for this date
              const slots = await getMergedFreeSlots(dateStr, 'primary', reevaBookings, context.detailerId, 120, 30, detailerTimezone);
              if (slots && slots.length > 0) {
                availableSlots.push(...slots.slice(0, 3)); // Limit to 3 slots per day
              }
            }
            
            if (availableSlots.length > 0) {
              const slotList = availableSlots.slice(0, 6).map((slot, index) => 
                `${index + 1}. ${slot.startLocal}`
              ).join('\n');
              
              // Check if user also asked about services
              const asksAboutServices = userMessage.toLowerCase().includes('services') || userMessage.toLowerCase().includes('provide');
              const servicesInfo = asksAboutServices ? 
                '\n\nOur services include:\n• Full Detail (exterior + interior)\n• Interior Detail\n• Exterior Detail\n• Ceramic Coating\n• Custom packages available\n\n' : '';
              
              response = `Here are our available appointments:\n\n${slotList}${servicesInfo}\nWhich one works for you? Just reply with the number (1, 2, 3, etc.)`;
              newContext = await updateConversationContext(context, 'awaiting_choice', { slots: availableSlots.slice(0, 6) });
            } else {
              const businessHours = await formatBusinessHours(context.detailerId);
              const asksAboutServices = userMessage.toLowerCase().includes('services') || userMessage.toLowerCase().includes('provide');
              const servicesInfo = asksAboutServices ? 
                '\n\nOur services include:\n• Full Detail (exterior + interior)\n• Interior Detail\n• Exterior Detail\n• Ceramic Coating\n• Custom packages available\n\n' : '';
              response = `I don't have any immediate availability. What date works for you? (We're open ${businessHours})${servicesInfo}`;
              newContext = await updateConversationContext(context, 'awaiting_date');
            }
          } catch (error) {
            console.error('Error getting available slots:', error);
            const businessHours = await formatBusinessHours(context.detailerId);
            const asksAboutServices = userMessage.toLowerCase().includes('services') || userMessage.toLowerCase().includes('provide');
            const servicesInfo = asksAboutServices ? 
              '\n\nOur services include:\n• Full Detail (exterior + interior)\n• Interior Detail\n• Exterior Detail\n• Ceramic Coating\n• Custom packages available\n\n' : '';
            response = `I'd be happy to help you find a time! What date works for you? (We're open ${businessHours})${servicesInfo}`;
            newContext = await updateConversationContext(context, 'awaiting_date');
          }
          break;
        }
        
        // THEN: Check if user is requesting a service (e.g., "I need a full detail", "Hey! I need an interior detail")
        // But exclude availability queries that might contain words like "appointment" or "services"
        const serviceRequestMatch = userMessage.match(/(?:i\s+need|i\s+want|hey|hi|hello|can\s+i\s+get|book|schedule|detail|cleaning|wash)(?!.*(?:available|times|appointments|services|provide))/i);
        
        if (serviceRequestMatch) {
          // User is requesting a service - reset to idle state to start fresh
          console.log('🔍 DEBUG: Service request detected, resetting conversation state to idle');
          const businessHours = await formatBusinessHours(context.detailerId);
          response = `Hi! I'd be happy to help you schedule a car detail. What date works for you? (We're open ${businessHours})`;
          newContext = await updateConversationContext(context, 'idle');
          break;
        }
        
        // Check if user is asking about availability (e.g., "Is 11 AM available?", "Is 11 AM on October 13th available?", "Ok, is October 15th 1 PM available?")
        const availabilityQueryMatch = userMessage.match(/(?:is|ok,?\s+is)\s+(?:(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:on\s+)?)?(october|november|december|january|february|march|april|may|june|july|august|september|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)?\s*(\d{1,2})?(?:st|nd|rd|th)?\s*(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:available|free|open)?/i);
        
        if (availabilityQueryMatch) {
          // User is asking about availability for a specific time
          const [, hour1, minute1 = '00', period1, month, day, hour2, minute2 = '00', period2] = availabilityQueryMatch;
          
          // Determine which time format was used
          const hour = hour2 || hour1;
          const minute = hour2 ? minute2 : minute1;
          const period = hour2 ? period2 : period1;
          
          // Parse time
          let hour24 = parseInt(hour);
          if (period?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
          if (period?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
          
          const requestedTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
          
          // If no specific date mentioned, check for available times in general
          if (!month || !day) {
            // Get available slots for the next few days
            const { getMergedFreeSlots } = await import('./slotComputationV2');
            
            // Check availability for next 5 days
            const availableSlots = [];
            for (let i = 1; i <= 5; i++) {
              const checkDate = new Date();
              checkDate.setDate(checkDate.getDate() + i);
              const dateStr = checkDate.toISOString().split('T')[0];
              
              const slots = await getMergedFreeSlots(
                dateStr,
                'primary',
                [], // reevaBookings - empty for now, will be fetched inside the function
                context.detailerId,
                240, // durationMinutes
                30, // stepMinutes
                detailerTimezone
              );
              
              // Find slots that match the requested time
              const matchingSlots = slots.filter(slot => {
                const slotTime = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
                if (!slotTime) return false;
                
                const slotHour = slotTime[1];
                const requestedTime12 = `${hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`;
                
                return slotHour === requestedTime12;
              });
              
              availableSlots.push(...matchingSlots.slice(0, 2)); // Limit to 2 per day
            }
            
            if (availableSlots.length > 0) {
              const availableDates = availableSlots.slice(0, 3).map(slot => {
                const dateMatch = slot.label.match(/(october|november|december|january|february|march|april|may|june|july|august|september|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)\s+(\d{1,2})/i);
                return dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : 'date';
              }).join(', ');
              
              response = `Great news! ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is open on ${availableDates}. Which date sounds good to you?`;
              newContext = await updateConversationContext(context, 'awaiting_date', {
                metadata: { 
                  ...context.metadata, 
                  preferredTime: requestedTime
                }
              });
            } else {
              response = `Unfortunately ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is pretty booked up for the next few days. What other time might work for you?`;
              newContext = await updateConversationContext(context, 'awaiting_date');
            }
          } else {
            // Specific date mentioned - check availability for that date
            const currentYear = new Date().getFullYear();
            const monthMap: { [key: string]: number } = {
              'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
              'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
              'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
              'nov': 10, 'november': 10, 'dec': 11, 'december': 11
            };
            
            const monthIndex = monthMap[month.toLowerCase()];
            if (monthIndex !== undefined) {
              const requestedDate = new Date(Date.UTC(currentYear, monthIndex, parseInt(day)));
              const dateStr = requestedDate.toISOString().split('T')[0];
              
              const { getMergedFreeSlots } = await import('./slotComputationV2');
              const slots = await getMergedFreeSlots(
                dateStr,
                'primary',
                [], // reevaBookings - empty for now, will be fetched inside the function
                context.detailerId,
                240, // durationMinutes
                30, // stepMinutes
                detailerTimezone
              );
              
              // Check if the requested time is available
              const isAvailable = slots.some(slot => {
                const slotTime = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
                if (!slotTime) return false;
                
                const slotHour = slotTime[1];
                const requestedTime12 = `${hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`;
                
                return slotHour === requestedTime12;
              });
              
              if (isAvailable) {
                response = `Yes! ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} on ${month} ${day} is wide open. Want me to book that for you?`;
                
                const selectedSlot = {
                  startLocal: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`,
                  startISO: `${dateStr}T${requestedTime}:00.000Z`,
                  label: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`,
                  date: dateStr
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
                  response = `Hmm, ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} on ${month} ${day} is already taken. But I've got these times open that day: ${availableTimes}.\n\nAny of those work for you?`;
                } else {
                  response = `Sorry, ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} on ${month} ${day} is booked and that day is pretty much full. What other day might work?`;
                }
                newContext = await updateConversationContext(context, 'awaiting_time');
              }
            } else {
              response = `I didn't understand that date. Please try again (e.g., 'tomorrow', 'Friday', or '10/15')`;
              newContext = await updateConversationContext(context, 'awaiting_date');
            }
          }
          break;
        }
        
        // Check if user is selecting a specific date and time (e.g., "Oct 9 at 3 PM", "let's do October 10th at 9:30 AM", "I am available on October 15th at 10 AM")
        const dateTimeSelectionMatch = userMessage.match(/(?:let'?s?\s+do|lets\s+do|ok,?\s+let'?s?\s+do|ok\s+lets\s+do|ok,?\s+lets\s+do|i'?ll\s+take|book|schedule|i\s+said|i\s+want|i\s+need|how\s+about|i\s+am\s+available\s+on)\s+(october|november|december|january|february|march|april|may|june|july|august|september|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        
        // Also check for "I am available on [date] at [time]" pattern specifically
        const availabilitySelectionMatch = userMessage.match(/i\s+am\s+available\s+on\s+(october|november|december|january|february|march|april|may|june|july|august|september|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)\s+(\d{1,2})(?:st|nd|rd|th)?\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        
        if (dateTimeSelectionMatch || availabilitySelectionMatch) {
          // User is selecting a specific date and time for booking
          try {
            const match = dateTimeSelectionMatch || availabilitySelectionMatch;
            const [, month, day, hour, minute = '00', period] = match!;
            const currentYear = new Date().getFullYear();
            
            console.log('🔍 DEBUG: Date/time selection matched:', {
              userMessage,
              matchType: dateTimeSelectionMatch ? 'dateTimeSelectionMatch' : 'availabilitySelectionMatch',
              month,
              day,
              hour,
              minute,
              period
            });
            
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
            
            // Create date in UTC to avoid timezone issues
            const requestedDate = new Date(Date.UTC(currentYear, monthIndex, parseInt(day)));
            
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
              
              const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: detailerTimezone });
              const end = start.plus({ minutes: duration });
              
              return {
                start: start.toUTC().toISO() || '',
                end: end.toUTC().toISO() || ''
              };
            }).filter(booking => booking.start && booking.end);
            
            const slots = await getMergedFreeSlots(
              dateStr,
              'primary',
              reevaBookings,
              context.detailerId,
              120,
              30,
              detailerTimezone
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
              
              // Create a mock slot for the selected time with date field
              const selectedSlot = {
                startLocal: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
                startISO: `${dateStr}T${requestedTime}:00.000Z`,
                label: `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || ''}`,
                date: dateStr // Add date field for booking creation
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
            const businessHours = await formatBusinessHours(context.detailerId);
            response = `I had trouble processing that date and time. What date works for you? (We're open ${businessHours})`;
            newContext = await updateConversationContext(context, 'awaiting_date');
          }
          break;
        }

        // Check if user is confirming a booking with a specific time (e.g., "Ok, lets book it at 4 PM then")
        const bookingConfirmationMatch = userMessage.match(/(?:ok,?\s+lets?\s+book\s+it\s+at|ok,?\s+lets?\s+do\s+it\s+at|ok,?\s+book\s+it\s+at|ok,?\s+do\s+it\s+at|ok,?\s+lets?\s+book|ok,?\s+lets?\s+do)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        
        if (bookingConfirmationMatch) {
          // User is confirming a booking with a specific time
          const [, hour, minute = '00', period] = bookingConfirmationMatch;
          
          // Parse time
          let hour24 = parseInt(hour);
          if (period?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
          if (period?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
          
          const requestedTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
          
          // Check if we have a selected date from context
          const selectedDate = context.metadata?.selectedDate;
          if (selectedDate) {
            // We have a date, check availability for this time on that date
            const { getMergedFreeSlots } = await import('./slotComputationV2');
            const slots = await getMergedFreeSlots(
              selectedDate,
              'primary',
              [], // reevaBookings - empty for now, will be fetched inside the function
              context.detailerId,
              240, // durationMinutes
              30, // stepMinutes
              detailerTimezone
            );
            
            // Check if the requested time is available
            const matchingSlot = slots.find(slot => {
              const slotTime = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
              if (!slotTime) return false;
              
              const slotHour = slotTime[1];
              const requestedTime12 = `${hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`;
              
              return slotHour === requestedTime12;
            });
            
            if (matchingSlot) {
              response = `Perfect! I've got ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} on ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} available for you.\n\nJust reply with 'yes' to confirm and I'll get this booked!`;
              
              newContext = await updateConversationContext(context, 'awaiting_confirm', {
                selectedSlot: matchingSlot,
                metadata: { 
                  ...context.metadata, 
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
                response = `Ah, ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is actually taken on ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. But I have these times open: ${availableTimes}.\n\nAny of these work for you?`;
              } else {
                response = `Unfortunately ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is booked on ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} and that day is pretty much full. What other day might work for you?`;
              }
              newContext = await updateConversationContext(context, 'awaiting_time');
            }
          } else {
            // No selected date, ask for a date
            response = `Great! ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} sounds good. What date works for you?`;
            newContext = await updateConversationContext(context, 'awaiting_date', {
              metadata: { 
                ...context.metadata, 
                preferredTime: requestedTime
              }
            });
          }
          break;
        }

        // Check if user is suggesting a time only (e.g., "How about 8 AM?", "What about 3 PM?")
        const timeOnlyMatch = userMessage.match(/(?:how\s+about|what\s+about|can\s+we\s+do|let'?s\s+do)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        
        if (timeOnlyMatch) {
          // User is suggesting a time without a date - check if we have a selected date
          const [, hour, minute = '00', period] = timeOnlyMatch;
          
          // Parse time
          let hour24 = parseInt(hour);
          if (period?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
          if (period?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
          
          const requestedTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
          
          // Check if we have a selected date from context
          const selectedDate = context.metadata?.selectedDate;
          if (selectedDate) {
            // We have a date, check availability for this time on that date
            const { getMergedFreeSlots } = await import('./slotComputationV2');
            const slots = await getMergedFreeSlots(
              selectedDate,
              'primary',
              [], // reevaBookings - empty for now, will be fetched inside the function
              context.detailerId,
              240, // durationMinutes
              30, // stepMinutes
              detailerTimezone
            );
            
            // Check if the requested time is available
            const matchingSlot = slots.find(slot => {
              const slotTime = slot.label.match(/(\d{1,2}:\d{2} [AP]M)/);
              if (!slotTime) return false;
              
              const slotHour = slotTime[1];
              const requestedTime12 = `${hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')}`;
              
              return slotHour === requestedTime12;
            });
            
            if (matchingSlot) {
              response = `Yes! ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is available. Would you like to book it?`;
              
              newContext = await updateConversationContext(context, 'awaiting_confirm', {
                selectedSlot: matchingSlot,
                metadata: { 
                  ...context.metadata, 
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
                response = `Sorry, ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is not available. Here are the available times: ${availableTimes}. Which time works for you?`;
              } else {
                response = `Sorry, ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} is not available. That day is fully booked. What other date works for you?`;
              }
              newContext = await updateConversationContext(context, 'awaiting_time');
            }
          } else {
            // No selected date, ask for a date
            response = `Great! ${hour}:${minute} ${period?.toUpperCase() || (hour24 < 12 ? 'AM' : 'PM')} sounds good. What date works for you?`;
            newContext = await updateConversationContext(context, 'awaiting_date', {
              metadata: { 
                ...context.metadata, 
                preferredTime: requestedTime
              }
            });
          }
          break;
        }

        // If not a date+time selection, try to parse as just a date
        // Parse date from user message
        const { parseDateV2 } = await import('./timeUtilsV2');
        const parsedDate = parseDateV2(userMessage, detailerTimezone);
        const dateStr = parsedDate.toFormat('yyyy-MM-dd');
        
        // Get available slots for this date
        const { getMergedFreeSlots } = await import('./slotComputationV2');
        
        // Use primary calendar
        const calendarId = 'primary';
        
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
          
          const start = DateTime.fromISO(`${bookingDate}T${startTime}`, { zone: detailerTimezone });
          const end = start.plus({ minutes: duration });
          
          return {
            start: start.toUTC().toISO() || '',
            end: end.toUTC().toISO() || ''
          };
        }).filter(booking => booking.start && booking.end);
        
        const slots = await getMergedFreeSlots(
          dateStr,
          calendarId,
          reevaBookings,
          context.detailerId,
          240, // 4 hours for full detail
          30,  // 30-minute steps
          detailerTimezone
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
        
        // Check if user is confirming (e.g., "yes", "confirm") and we have a selected slot
        const isConfirming = /^(yes|confirm|confirmed|book|book it|schedule)$/i.test(userMessage.trim());
        if (isConfirming && context.selectedSlot) {
          // User is confirming their selected time - CREATE THE BOOKING IMMEDIATELY
          try {
            const { createBookingWithRetry } = await import('./bookingClient');
            
            // Extract just the time portion from the slot description
            const timeMatch = context.selectedSlot?.startLocal?.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
            const extractedTime = timeMatch ? timeMatch[1] : '10:00 AM';
            
            // FIX: Use the date from the selected slot, not from metadata
            const selectedDate = (context.selectedSlot as any).date || new Date().toISOString().split('T')[0];
            
            const bookingRequest = {
              detailerId: context.detailerId,
              date: selectedDate, // Use the actual selected slot date
              time: extractedTime,
              durationMinutes: 240,
              tz: detailerTimezone,
              title: `Customer - Full Detail`,
              customerName: 'Customer',
              customerPhone: context.customerPhone,
              vehicleType: 'Not specified',
              vehicleLocation: 'Not provided',
              services: ['Full Detail'],
              source: 'AI'
            };
            
            const idempotencyKey = `${context.detailerId}:${context.customerPhone}:${context.messageSid}`;
            const bookingResult = await createBookingWithRetry(bookingRequest, idempotencyKey);
            
            if (bookingResult.ok) {
              response = "Perfect! 📅 Your appointment is confirmed. You'll receive a confirmation text shortly.";
              newContext = await updateConversationContext(context, 'confirmed');
            } else {
              // IMPROVED: Handle conflicts by suggesting alternative times
              if (bookingResult.error && bookingResult.error.includes('conflict')) {
                if (bookingResult.suggestions && bookingResult.suggestions.length > 0) {
                  // Use dynamic suggestions from the booking API
                  const suggestionsText = bookingResult.suggestions.map((slot, i) => 
                    `${i + 1}. ${slot.startLocal}`
                  ).join('\n');
                  
                  response = `Sorry, that time slot just got booked by someone else. Here are some alternative times:\n\n${suggestionsText}\n\nWhich time would work for you?`;
                } else {
                  response = "Sorry, that time slot just got booked by someone else. Please try asking for available times again.";
                }
                newContext = await updateConversationContext(context, 'awaiting_time');
              } else {
                response = `Hit a snag creating the booking. ${bookingResult.message || 'Please try "confirm" again in a moment or text HELP.'}`;
                newContext = await updateConversationContext(context, 'awaiting_confirm');
              }
            }
          } catch (error) {
            console.error('Error creating booking:', error);
            response = "I'm having trouble creating your appointment right now. Please try again in a moment, or contact us directly for assistance.";
            newContext = await updateConversationContext(context, 'error');
          }
          break;
        }
        
        // Check if user is asking for available times (e.g., "what times?", "I don't see the times")
        const isAskingForTimes = /what times?|don'?t see|show me|available|options/i.test(userMessage);
        
        if (isAskingForTimes && slotsToUse.length > 0) {
          // Group slots by date and format nicely
          const slotsByDate: { [date: string]: any[] } = {};
          
          slotsToUse.forEach(slot => {
            const dateKey = (slot as any).date || (slot.startUtcISO ? new Date(slot.startUtcISO).toISOString().split('T')[0] : 'unknown');
            if (!slotsByDate[dateKey]) {
              slotsByDate[dateKey] = [];
            }
            slotsByDate[dateKey].push(slot);
          });
          
          // Format each day with its times
          const dayOptions = Object.keys(slotsByDate).map(dateKey => {
            const daySlots = slotsByDate[dateKey];
            const dayName = new Date(dateKey).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            });
            
            const times = daySlots.map(slot => {
              const timeMatch = slot.startLocal.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
              return timeMatch ? timeMatch[1] : slot.startLocal;
            }).join(', ');
            
            return `${dayName}: ${times}`;
          }).join('\n');
          
          response = `Here are our available times:\n\n${dayOptions}\n\nWhich day and time works for you?`;
          newContext = await updateConversationContext(context, 'awaiting_time');
          break;
        }
        
        // Parse slot selection from user message
        const selectedSlot = pickSlotFromMessage(userMessage, slotsToUse);
        
        console.log('🔍 DEBUG: Selected slot:', selectedSlot);
        
        if (!selectedSlot) {
          // Show the available times to the user
          if (slotsToUse.length > 0) {
            // Group slots by date and format nicely
            const slotsByDate: { [date: string]: any[] } = {};
            
            slotsToUse.forEach(slot => {
              const dateKey = (slot as any).date || (slot.startUtcISO ? new Date(slot.startUtcISO).toISOString().split('T')[0] : 'unknown');
              if (!slotsByDate[dateKey]) {
                slotsByDate[dateKey] = [];
              }
              slotsByDate[dateKey].push(slot);
            });
            
            // Format each day with its times
            const dayOptions = Object.keys(slotsByDate).map(dateKey => {
              const daySlots = slotsByDate[dateKey];
              const dayName = new Date(dateKey).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              });
              
              const times = daySlots.map(slot => {
                const timeMatch = slot.startLocal.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
                return timeMatch ? timeMatch[1] : slot.startLocal;
              }).join(', ');
              
              return `${dayName}: ${times}`;
            }).join('\n');
            
            response = `Here are our available times:\n\n${dayOptions}\n\nWhich day and time works for you?`;
          } else {
            response = "I don't have any available times right now. What day works for you?";
            newContext = await updateConversationContext(context, 'awaiting_date');
          }
          newContext = await updateConversationContext(context, 'awaiting_time');
        } else {
          // Extract time from startLocal for display
          const timeMatch = selectedSlot.startLocal.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          const timeStr = timeMatch ? timeMatch[1] : selectedSlot.startLocal;
          response = `Great! I have you down for ${timeStr}.\n\nPlease confirm by replying 'yes' or 'confirm' to book this appointment.`;
          
          // FIX: Clear old selected slot and set new one to prevent conflicts
          newContext = await updateConversationContext(context, 'awaiting_confirm', {
            selectedSlot,
            slots: [], // Clear old slots to prevent confusion
            metadata: {
              ...context.metadata,
              selectedDate: (selectedSlot as any).date || new Date().toISOString().split('T')[0]
            }
          });
        }
      } catch (error) {
        console.error('Error parsing time selection:', error);
        response = "Please pick one of the shown times by number (1, 2, 3, etc.)";
        newContext = await updateConversationContext(context, 'awaiting_time');
      }
      break;

    case 'awaiting_confirm':
      console.log('🔍 DEBUG: awaiting_confirm state - User message:', userMessage);
      console.log('🔍 DEBUG: awaiting_confirm state - selectedSlot:', context.selectedSlot);
      console.log('🔍 DEBUG: awaiting_confirm state - metadata:', context.metadata);
      
      if (userConfirmed(userMessage)) {
        // Attempt to create booking
        try {
          const { createBookingWithRetry } = await import('./bookingClient');
          
          // FIX: Extract time properly and use correct date
          const timeMatch = context.selectedSlot?.startLocal?.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          const extractedTime = timeMatch ? timeMatch[1] : '10:00 AM';
          const selectedDate = (context.selectedSlot as any)?.date || context.metadata?.selectedDate || new Date().toISOString().split('T')[0];
          
          console.log('🔍 DEBUG: Booking request details:', {
            extractedTime,
            selectedDate,
            selectedSlot: context.selectedSlot
          });
          
          const bookingRequest = {
            detailerId: context.detailerId,
            date: selectedDate,
            time: extractedTime,
            durationMinutes: 240,
            tz: detailerTimezone,
            title: `Customer - Full Detail`,
            customerName: 'Customer',
            customerPhone: context.customerPhone,
            vehicleType: 'Not specified',
            vehicleLocation: 'Not provided',
            services: ['Full Detail'],
            source: 'AI'
          };
          
          const idempotencyKey = `${context.detailerId}:${context.customerPhone}:${context.messageSid}`;
          const bookingResult = await createBookingWithRetry(bookingRequest, idempotencyKey);
          
          if (bookingResult.ok) {
            response = "Booked! 📅 Your appointment is confirmed. We'll send you a reminder closer to your appointment time.";
            newContext = await updateConversationContext(context, 'confirmed');
          } else {
            // IMPROVED: Handle conflicts by suggesting alternative times
            if (bookingResult.error && bookingResult.error.includes('conflict')) {
              if (bookingResult.suggestions && bookingResult.suggestions.length > 0) {
                // Use dynamic suggestions from the booking API
                const suggestionsText = bookingResult.suggestions.map((slot, i) => 
                  `${i + 1}. ${slot.startLocal}`
                ).join('\n');
                
                response = `Sorry, that time slot just got booked by someone else. Here are some alternative times:\n\n${suggestionsText}\n\nWhich time would work for you?`;
              } else {
                response = "Sorry, that time slot just got booked by someone else. Please try asking for available times again.";
              }
              newContext = await updateConversationContext(context, 'awaiting_time');
            } else {
              response = `Hit a snag creating the booking. ${bookingResult.message || 'Please try "confirm" again in a moment or text HELP.'}`;
              newContext = await updateConversationContext(context, 'awaiting_confirm');
            }
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
        
        console.log('🔍 DEBUG: Time matching:', {
          message,
          slotTime,
          normalizedTime,
          hour,
          minute,
          period,
          includesNormalized: slotTime.includes(normalizedTime),
          includesUpperCase: slotTime.includes(normalizedTime.toUpperCase())
        });
        
        // Check if this time appears in the slot (case-insensitive)
        if (slotTime.includes(normalizedTime) || slotTime.includes(`${hour}:${minute} ${period}`) || slotTime.includes(normalizedTime.toUpperCase())) {
          console.log('🔍 DEBUG: Time match found for slot:', slot.startLocal);
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
 * Format business hours from detailer profile
 */
async function formatBusinessHours(detailerId: string): Promise<string> {
  try {
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { businessHours: true }
    });
    
    if (!detailer?.businessHours) {
      return "Mon–Fri 8a–6p"; // fallback
    }
    
    const businessHours = detailer.businessHours as any;
    if (typeof businessHours === 'object' && businessHours !== null) {
      // Format the business hours object into a readable string
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayAbbrevs = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      let formattedHours = '';
      let currentRange = '';
      let startDay = '';
      let endDay = '';
      let startTime = '';
      let endTime = '';
      
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const dayAbbrev = dayAbbrevs[i];
        const hours = businessHours[day.toLowerCase()];
        
        if (hours && hours.open && hours.close) {
          const openTime = formatTime(hours.open);
          const closeTime = formatTime(hours.close);
          
          if (!startTime) {
            // Start of a range
            startDay = dayAbbrev;
            startTime = openTime;
            endTime = closeTime;
          } else if (startTime === openTime && endTime === closeTime) {
            // Same hours, extend the range
            endDay = dayAbbrev;
          } else {
            // Different hours, finish current range and start new one
            if (currentRange) currentRange += ', ';
            currentRange += formatRange(startDay, endDay, startTime, endTime);
            
            startDay = dayAbbrev;
            endDay = dayAbbrev;
            startTime = openTime;
            endTime = closeTime;
          }
        } else if (startTime) {
          // Closed day, finish current range
          if (currentRange) currentRange += ', ';
          currentRange += formatRange(startDay, endDay, startTime, endTime);
          
          startDay = '';
          endDay = '';
          startTime = '';
          endTime = '';
        }
      }
      
      // Finish the last range
      if (startTime) {
        if (currentRange) currentRange += ', ';
        currentRange += formatRange(startDay, endDay, startTime, endTime);
      }
      
      return currentRange || "Mon–Fri 8a–6p";
    }
    
    return "Mon–Fri 8a–6p"; // fallback
  } catch (error) {
    console.error('Error formatting business hours:', error);
    return "Mon–Fri 8a–6p"; // fallback
  }
}

/**
 * Format time from 24-hour format to 12-hour format
 */
function formatTime(time: string): string {
  if (!time) return '8a';
  
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'p' : 'a';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  if (minute === 0) {
    return `${displayHour}${period}`;
  } else {
    return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
  }
}

/**
 * Format day range and time
 */
function formatRange(startDay: string, endDay: string, startTime: string, endTime: string): string {
  const dayRange = startDay === endDay ? startDay : `${startDay}–${endDay}`;
  return `${dayRange} ${startTime}–${endTime}`;
}

/**
 * Check if user confirmed the booking
 */
function userConfirmed(userMessage: string): boolean {
  const message = userMessage.trim().toLowerCase();
  const confirmWords = ['yes', 'confirm', 'confirmed', 'book', 'book it', 'schedule'];
  return confirmWords.some(word => message.includes(word));
}
