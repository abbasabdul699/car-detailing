/**
 * Conversation state machine to prevent spam and manage booking flow
 * Implements the state machine pattern for SMS conversations
 */

import { PrismaClient } from '@prisma/client';

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
  slots?: Array<{ startLocal: string; startISO: string; label: string }>;
  selectedSlot?: { startLocal: string; startISO: string; label: string };
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
    const existingMessage = await prisma.message.findUnique({
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
  detailerServices: any[]
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
      // Check if user is asking for available times
      const isAskingForAvailability = /available|times?|slots?|openings?|schedule/i.test(userMessage);
      
      if (isAskingForAvailability) {
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
            
            const slots = await getMergedFreeSlots(
              dateStr,
              'primary', // Use primary calendar for now
              [], // No existing bookings for now
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
            response = `Here are our available times:\n\n${availableSlots.join('\n')}\n\nWhich day and time works for you?`;
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
        const slots = await getMergedFreeSlots(
          dateStr,
          calendarId,
          [], // Will be populated with existing bookings
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
        // Parse slot selection from user message
        const selectedSlot = pickSlotFromMessage(userMessage, context.slots || []);
        
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
  slots: Array<{ startLocal: string; startISO: string; label: string }>
): { startLocal: string; startISO: string; label: string } | null {
  const message = userMessage.trim().toLowerCase();
  
  // Check for number selection (1, 2, 3, etc.)
  const numberMatch = message.match(/^(\d+)$/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1]) - 1;
    if (index >= 0 && index < slots.length) {
      return slots[index];
    }
  }
  
  // Check for time mentioned in message
  for (const slot of slots) {
    if (message.includes(slot.startLocal.toLowerCase())) {
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
