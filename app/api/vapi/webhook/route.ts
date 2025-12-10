import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function generateBusinessHoursInfo(businessHours: any): string {
  if (!businessHours) {
    return "Business hours: Not specified";
  }

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let hoursInfo = "Business hours:\n";
  
  for (let i = 0; i < dayNames.length; i++) {
    const day = dayNames[i];
    const dayLabel = dayLabels[i];
    
    if (businessHours[day] && businessHours[day].length === 2) {
      const [open, close] = businessHours[day];
      hoursInfo += `- ${dayLabel}: ${open} - ${close}\n`;
    } else {
      hoursInfo += `- ${dayLabel}: Closed\n`;
    }
  }
  
  return hoursInfo;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    // Vapi can send type at top level OR inside message object
    const { type, call, message } = body;
    const messageType = message?.type || type;

    console.log('🔍 Webhook type detection:', { 
      topLevelType: type, 
      messageType: message?.type, 
      finalType: messageType 
    });

    if (messageType === 'assistant-request') {
      return handleAssistantRequest(body);
    }

    if (messageType === 'function-call') {
      return handleFunctionCall(body);
    }

    if (messageType === 'status-update') {
      return handleStatusUpdate(body);
    }

    if (messageType === 'end-of-call-report') {
      console.log('📞 Routing to handleEndOfCallReport');
      return handleEndOfCallReport(body);
    }

    if (messageType === 'conversation-update') {
      console.log('📞 Routing to handleConversationUpdate');
      return handleConversationUpdate(body);
    }

    // Default response for unknown types
    console.log('⚠️ Unknown webhook type:', messageType);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Vapi webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleAssistantRequest(body: any) {
  const { call } = body;
  const { customer } = call;
  
  // Extract phone number and find detailer
  const customerPhone = customer?.number;
  if (!customerPhone) {
    return NextResponse.json({ 
      error: 'No customer phone number provided' 
    }, { status: 400 });
  }

  // Find detailer by phone number (assuming the Vapi phone number maps to a detailer)
  const detailer = await prisma.detailer.findFirst({
    where: {
      twilioPhoneNumber: call.assistant?.phoneNumber || call.assistant?.number
    },
    include: {
      services: {
        include: {
          service: true
        }
      }
    }
  });

  if (!detailer) {
    return NextResponse.json({ 
      error: 'Detailer not found for this phone number' 
    }, { status: 404 });
  }

  // Generate business hours information for the system prompt
  console.log('Detailer business hours v2:', detailer.businessHours);
  const businessHoursInfo = generateBusinessHoursInfo(detailer.businessHours);
  console.log('Generated business hours info v2:', businessHoursInfo);

  // Return assistant configuration
  return NextResponse.json({
    assistant: {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 200
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: 'pNInz6obpgDQGcFmaJgB' // Adam voice
      },
      firstMessage: `Hi! Thanks for calling ${detailer.businessName}. I'm your AI assistant. How can I help you today?`,
      systemPrompt: `You are the AI assistant for ${detailer.businessName}, a car detailing business in ${detailer.city}, ${detailer.state}.

Available services: ${detailer.services?.map(s => s.service.name).join(', ') || 'Various car detailing services'}

` + businessHoursInfo + `

You're having a natural phone conversation with a customer. Be friendly, helpful, and conversational.

CONVERSATIONAL BOOKING FLOW:
1. Start by asking what service they need (don't overwhelm with options)
2. Ask ONE question at a time - be conversational, not interrogative
3. Get vehicle info (make, model, year) naturally in conversation
4. Ask about their preferred date/time
5. Get their name and phone number
6. Get service address
7. Complete the booking DURING the call - don't defer to text confirmation

IMPORTANT BOOKING RULES:
- Ask ONE question at a time, not a list of requirements
- Be conversational: "What kind of service are you looking for?" not "I need service type, date, time, address, name, phone..."
- When you have all info, use create_booking function to complete the booking immediately
- Confirm the booking details back to them during the call
- Send a confirmation text AFTER completing the booking, not instead of it

AVAILABILITY CHECKING:
1. If a customer asks for a specific time, use check_availability first
2. If check_availability fails or returns no results, use the calendar_slots_[duration] functions to find available times
3. NEVER default to suggesting 12 PM or any specific time without checking availability first
4. Always use the calendar_slots functions to find actual available slots
5. ONLY suggest times that fall within the business hours listed above

Be conversational and natural - not robotic. Show enthusiasm and be helpful.`,
      functions: [
        {
          name: 'check_availability',
          description: 'Check if a specific date and time is available for booking',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              },
              time: {
                type: 'string', 
                description: 'Time in HH:MM format (24-hour)'
              }
            },
            required: ['date', 'time']
          }
        },
        {
          name: 'create_booking',
          description: 'Create a new booking/appointment',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: 'Customer full name'
              },
              customerPhone: {
                type: 'string',
                description: 'Customer phone number'
              },
              vehicleMake: {
                type: 'string',
                description: 'Vehicle make (e.g., Toyota, Honda)'
              },
              vehicleModel: {
                type: 'string',
                description: 'Vehicle model (e.g., Camry, Civic)'
              },
              vehicleYear: {
                type: 'string',
                description: 'Vehicle year'
              },
              services: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of services requested'
              },
              scheduledDate: {
                type: 'string',
                description: 'Scheduled date in YYYY-MM-DD format'
              },
              scheduledTime: {
                type: 'string',
                description: 'Scheduled time in HH:MM format'
              },
              address: {
                type: 'string',
                description: 'Service location address'
              }
            },
            required: ['customerName', 'customerPhone', 'vehicleMake', 'vehicleModel', 'vehicleYear', 'services', 'scheduledDate', 'scheduledTime']
          }
        },
        {
          name: 'calendar_slots_1',
          description: 'Get available time slots for 1-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        {
          name: 'calendar_slots_1_5',
          description: 'Get available time slots for 1.5-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        {
          name: 'calendar_slots_2',
          description: 'Get available time slots for 2-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        {
          name: 'calendar_slots_2_5',
          description: 'Get available time slots for 2.5-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        {
          name: 'calendar_slots_3',
          description: 'Get available time slots for 3-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        {
          name: 'calendar_slots_3_5',
          description: 'Get available time slots for 3.5-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        {
          name: 'calendar_slots_4',
          description: 'Get available time slots for 4-hour jobs on a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        }
      ]
    }
  });
}

async function handleFunctionCall(body: any) {
  const { call, functionCall } = body;
  const { name, parameters } = functionCall;

  console.log('Vapi function call:', { name, parameters });

  try {
    console.log('Function call received:', { name, parameters });
    
    if (name === 'check_availability') {
      return await checkAvailability(parameters, call);
    }
    
    if (name === 'create_booking') {
      return await createBooking(parameters, call);
    }

    // Handle calendar slot functions
    if (name.startsWith('calendar_slots_')) {
      console.log('Handling calendar slot function:', name);
      return await handleCalendarSlots(name, parameters, call);
    }

    // Handle specific calendar slot functions
    if (name === 'calendar_slots_1' || name === 'calendar_slots_1_5' || name === 'calendar_slots_2' || 
        name === 'calendar_slots_2_5' || name === 'calendar_slots_3' || name === 'calendar_slots_3_5' || 
        name === 'calendar_slots_4') {
      console.log('Handling specific calendar slot function:', name);
      return await handleCalendarSlots(name, parameters, call);
    }

    console.log('Function not found:', name);
    return NextResponse.json({
      result: 'Function not implemented'
    });

  } catch (error) {
    console.error('Function call error:', error);
    return NextResponse.json({
      result: 'Error: ' + error.message
    });
  }
}

async function checkAvailability(parameters: any, call: any) {
  const { date, time } = parameters;
  
  try {
    // Find detailer by the Twilio phone number that Vapi is using for THIS call
    const assistantNumber = call?.assistant?.phoneNumber || call?.assistant?.number || '';
    const lookupNumber = assistantNumber || process.env.TWILIO_PHONE_NUMBER || '';
    
    console.log('Vapi availability check v3:', { 
      assistantNumber, 
      lookupNumber, 
      date, 
      time,
      callAssistant: call?.assistant 
    });

    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: lookupNumber
      }
    });
    
    console.log('Found detailer:', detailer ? { id: detailer.id, businessName: detailer.businessName, twilioPhoneNumber: detailer.twilioPhoneNumber } : 'Not found');

    if (!detailer) {
      return NextResponse.json({
        result: 'Sorry, I could not find the business information. Please try again.'
      });
    }

    // Use your existing availability API
    const availabilityResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/vapi/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detailerId: detailer.id,
        date,
        time
      })
    });

    const availabilityData = await availabilityResponse.json();
    
    console.log('Availability API response:', availabilityData);
    console.log('Business hours from API:', availabilityData.businessHours);

    // Check if the API returned an error or no data
    if (!availabilityData || availabilityData.error) {
      return NextResponse.json({
        result: 'I had trouble checking that specific time. Let me check my calendar for available slots instead.'
      });
    }

    if (availabilityData.available) {
      return NextResponse.json({
        result: `Great! ${date} at ${time} is available. Would you like to book this time slot?`
      });
    } else {
      // Always suggest available times when not available
      const availableTimes = [];
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Use detailer business hours to suggest available times
      const startHour = parseInt(detailer.businessHours[dayName][0].split(':')[0]);
      const endHour = parseInt(detailer.businessHours[dayName][1].split(':')[0]);
      
      // Suggest times within business hours
      for (let hour = startHour; hour < endHour; hour += 0.5) {
        const timeString = `${Math.floor(hour).toString().padStart(2, '0')}:${hour % 1 === 0 ? '00' : '30'}`;
        const time12Hour = convertTo12Hour(timeString);
        availableTimes.push(time12Hour);
      }
      
      return NextResponse.json({
        result: `Sorry, ${date} at ${time} is not available. I'm available on ${date} at ${availableTimes.join(', ')}. Which time works for you?`
      });
    }

  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json({
      result: 'Sorry, I had trouble checking availability. Let me check my calendar for available slots instead.'
    });
  }
}

async function createBooking(parameters: any, call: any) {
  const {
    customerName,
    customerPhone,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    services,
    scheduledDate,
    scheduledTime,
    address
  } = parameters;

  try {
    // Find detailer by the Twilio phone number that Vapi is using for THIS call
    const assistantNumber = call?.assistant?.phoneNumber || call?.assistant?.number || '';
    const lookupNumber = assistantNumber || process.env.TWILIO_PHONE_NUMBER || '';

    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: lookupNumber
      }
    });

    if (!detailer) {
      return NextResponse.json({
        result: 'Error: Detailer not found'
      });
    }

    // Use your existing booking API
    const bookingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/vapi/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detailerId: detailer.id,
        customerName,
        customerPhone,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        services,
        scheduledDate,
        scheduledTime,
        address
      })
    });

    const bookingData = await bookingResponse.json();

    if (bookingData.success) {
      return NextResponse.json({
        result: `Perfect! I've booked your appointment for ${scheduledDate} at ${scheduledTime}. You'll receive a confirmation text shortly. Is there anything else I can help you with?`
      });
    } else {
      return NextResponse.json({
        result: 'Sorry, I had trouble creating your booking. Please call back or try our website.'
      });
    }

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({
      result: 'Sorry, I had trouble creating your booking. Please call back or try our website.'
    });
  }
}

async function handleStatusUpdate(body: any) {
  try {
    const { call } = body;
    console.log('Vapi status update:', JSON.stringify(body, null, 2));

    // Vapi may send transcript updates during the call in status-update events
    // Store them if available
    if (call?.messages && Array.isArray(call.messages)) {
      const customerPhone = call?.customer?.number;
      const assistantPhone = call?.assistant?.phoneNumber || call?.assistant?.number;
      const callId = call?.id;

      if (!customerPhone || !assistantPhone || !callId) {
        return NextResponse.json({ success: true });
      }

      const detailer = await prisma.detailer.findFirst({
        where: {
          twilioPhoneNumber: assistantPhone
        }
      });

      if (!detailer) {
        return NextResponse.json({ success: true });
      }

      const { normalizeToE164 } = await import('@/lib/phone');
      const normalizedCustomerPhone = normalizeToE164(customerPhone) || customerPhone;

      // Find or create conversation
      let conversation = await prisma.conversation.findUnique({
        where: {
          detailerId_customerPhone: {
            detailerId: detailer.id,
            customerPhone: normalizedCustomerPhone
          }
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            detailerId: detailer.id,
            customerPhone: normalizedCustomerPhone,
            status: 'active',
            channel: 'phone',
            lastMessageAt: new Date(),
          }
        });
      }

      // Store new messages from the transcript
      for (const message of call.messages) {
        const role = message.role;
        const content = message.content || message.message || '';
        
        if (!content.trim()) continue;

        const direction = role === 'user' ? 'inbound' : 'outbound';

        // Check if already exists
        const existing = await prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            vapiCallId: callId,
            content: content,
            direction: direction,
            channel: 'phone'
          }
        });

        if (!existing) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: direction,
              content: content,
              channel: 'phone',
              vapiCallId: callId,
              status: direction === 'inbound' ? 'received' : 'sent',
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Vapi status update:', error);
    return NextResponse.json({ success: true });
  }
}

async function handleEndOfCallReport(body: any) {
  try {
    const { message } = body;
    console.log('📞 Vapi end of call report received:', JSON.stringify(body, null, 2));

    // Extract call information from message structure
    const callData = message?.call || {};
    const callId = callData?.id || message?.artifact?.variables?.call?.id;
    const customerPhone = callData?.customer?.number || message?.customer?.number || message?.artifact?.variables?.customer?.number;
    const assistantPhone = message?.phoneNumber?.number || callData?.assistant?.phoneNumber || message?.artifact?.variables?.phoneNumber?.number;
    
    // Get transcript from artifact.messages or artifact.messagesOpenAIFormatted
    const artifact = message?.artifact || {};
    const transcriptArray = artifact.messagesOpenAIFormatted || artifact.messages || [];
    
    // Also check for transcript string format
    const transcriptString = artifact.transcript || message?.transcript;
    
    const endedReason = message?.endedReason || callData?.endedReason;
    const startedAt = message?.startedAt || callData?.startedAt;
    const endedAt = message?.endedAt || callData?.endedAt;
    const duration = endedAt && startedAt 
      ? Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : message?.durationSeconds || null;

    console.log('📞 Extracted end-of-call-report data:', {
      callId,
      customerPhone,
      assistantPhone,
      transcriptArrayLength: Array.isArray(transcriptArray) ? transcriptArray.length : 0,
      hasTranscriptString: !!transcriptString,
      duration,
      endedReason
    });

    if (!customerPhone || !assistantPhone) {
      console.error('❌ Missing phone numbers in Vapi end of call report:', { customerPhone, assistantPhone });
      return NextResponse.json({ success: true });
    }

    // Normalize phone numbers for matching (handle format differences)
    const { normalizeToE164 } = await import('@/lib/phone');
    const normalizedAssistantPhone = normalizeToE164(assistantPhone) || assistantPhone;
    
    // Try to find detailer with flexible phone number matching
    // Remove +1 prefix and compare last 10 digits
    const assistantDigits = normalizedAssistantPhone.replace(/\D/g, '').slice(-10);
    
    // Find all detailers and check phone numbers flexibly
    const detailers = await prisma.detailer.findMany({
      where: {
        twilioPhoneNumber: { not: null }
      }
    });
    
    let detailer = detailers.find(d => {
      if (!d.twilioPhoneNumber) return false;
      const detailerDigits = d.twilioPhoneNumber.replace(/\D/g, '').slice(-10);
      return detailerDigits === assistantDigits;
    });

    if (!detailer) {
      console.error('❌ Detailer not found for phone:', assistantPhone);
      console.log('🔍 Searched for:', assistantDigits, 'in detailers:', detailers.map(d => ({
        id: d.id,
        businessName: d.businessName,
        twilioPhoneNumber: d.twilioPhoneNumber
      })));
      return NextResponse.json({ success: true });
    }

    console.log('✅ Found detailer:', { id: detailer.id, businessName: detailer.businessName, phone: detailer.twilioPhoneNumber });

    // Normalize customer phone number to E164 format for consistent lookup
    const normalizedCustomerPhone = normalizeToE164(customerPhone) || customerPhone;

    // Find or create conversation for this phone call
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: normalizedCustomerPhone
        }
      }
    });

    if (!conversation) {
      console.log('📞 Creating new conversation for phone call');
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: normalizedCustomerPhone,
          status: 'active',
          channel: 'phone',
          lastMessageAt: new Date(),
        }
      });
      console.log('✅ Created conversation:', conversation.id);
    } else {
      // Update conversation channel if it's primarily phone
      if (conversation.channel !== 'phone') {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { channel: 'phone', lastMessageAt: new Date() }
        });
      }
    }

    // Store transcript messages from artifact.messagesOpenAIFormatted or artifact.messages
    console.log('📝 Processing transcript from end-of-call-report:', {
      transcriptArrayLength: transcriptArray.length,
      hasTranscriptString: !!transcriptString,
      sample: transcriptArray.length > 0 ? transcriptArray[0] : 'N/A'
    });

    let messagesToStore: any[] = [];
    
    // Prefer messagesOpenAIFormatted (cleaner format)
    if (transcriptArray && Array.isArray(transcriptArray) && transcriptArray.length > 0) {
      messagesToStore = transcriptArray;
      console.log('📝 Using artifact.messagesOpenAIFormatted');
    } else if (transcriptString) {
      // If we only have a transcript string, try to parse it
      console.log('📝 Only transcript string available, will parse it');
      // For now, we'll create a placeholder - in future we could parse the string
    }

    if (messagesToStore.length > 0) {
      console.log(`📝 Storing ${messagesToStore.length} messages from end-of-call-report`);
      
      let storedCount = 0;
      for (const msg of messagesToStore) {
        // Skip system messages and tool calls
        const role = msg.role;
        if (role === 'system' || role === 'tool' || role === 'tool_call_result' || role === 'tool_calls') {
          continue;
        }
        
        const content = msg.content || msg.message || '';
        
        // Handle timestamp - Vapi may send milliseconds or ISO string
        let timestamp = msg.timestamp || msg.time || msg.createdAt;
        if (typeof timestamp === 'number') {
          // If it's a number, assume milliseconds and convert to Date
          timestamp = new Date(timestamp);
        } else if (typeof timestamp === 'string') {
          // Try to parse ISO string
          timestamp = new Date(timestamp);
        } else if (!timestamp) {
          timestamp = new Date();
        }

        if (!content || !content.trim()) {
          continue;
        }

        // Map role to direction
        let direction: 'inbound' | 'outbound';
        if (role === 'user') {
          direction = 'inbound';
        } else if (role === 'assistant' || role === 'bot') {
          direction = 'outbound';
        } else {
          continue; // Skip unknown roles
        }

        // Check if message already exists (avoid duplicates)
        const existingMessage = await prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            vapiCallId: callId,
            content: content,
            direction: direction,
            channel: 'phone'
          }
        });

        if (!existingMessage) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: direction,
              content: content,
              channel: 'phone',
              vapiCallId: callId,
              status: direction === 'inbound' ? 'received' : 'sent',
              createdAt: timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now())
            }
          });
          storedCount++;
        }
      }

      console.log(`✅ Stored ${storedCount} new messages from end-of-call-report for call ${callId}`);
    } else {
      console.warn('⚠️ No transcript messages found in end-of-call-report. Checked:', {
        transcriptArrayLength: transcriptArray.length,
        hasTranscriptString: !!transcriptString,
        artifactKeys: Object.keys(artifact || {})
      });
      
      // Still create a placeholder message so conversation appears in dashboard
      if (conversation) {
        const placeholderMessage = `Phone call from ${normalizedCustomerPhone}${duration ? ` (Duration: ${Math.floor(duration / 60)}m ${duration % 60}s)` : ''}`;
        
        // Check if placeholder already exists
        const existingPlaceholder = await prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            vapiCallId: callId,
            channel: 'phone'
          }
        });

        if (!existingPlaceholder) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: 'inbound',
              content: placeholderMessage,
              channel: 'phone',
              vapiCallId: callId,
              status: 'received',
            }
          });
          console.log('✅ Created placeholder message for phone call without transcript');
        }
      }
    }

    // Update conversation metadata with call info
    const metadata = (conversation.metadata as any) || {};
    metadata.lastCallId = callId;
    metadata.lastCallDuration = duration;
    metadata.lastCallEndedReason = endedReason;
    metadata.lastCallEndedAt = endedAt || new Date().toISOString();

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        metadata: metadata,
        lastMessageAt: new Date()
      }
    });

    // Create notification for new phone call
    try {
      await prisma.notification.create({
        data: {
          detailerId: detailer.id,
          message: `📞 Phone call ended with ${normalizedCustomerPhone}${duration ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : ''}`,
          type: 'phone_call',
          link: `/detailer-dashboard/messages?conversationId=${conversation.id}`,
        },
      });
      console.log('✅ Created notification for phone call');
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
      // Don't fail the webhook if notification fails
    }

    console.log(`✅ Successfully processed end-of-call-report for call ${callId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Vapi end of call report:', error);
    return NextResponse.json({ success: true }); // Don't fail the webhook
  }
}

async function handleConversationUpdate(body: any) {
  try {
    const { message } = body;
    console.log('📞 Vapi conversation-update received:', JSON.stringify(body, null, 2));

    if (!message || !message.call) {
      console.log('⚠️ No call data in conversation-update');
      return NextResponse.json({ success: true });
    }

    const callData = message.call;
    const callId = callData?.id || callData?.phoneCallProviderId;
    const customerPhone = callData?.customer?.number || message.customer?.number;
    const assistantPhone = message.phoneNumber?.number || callData?.assistant?.phoneNumber;
    
    // Get transcript from conversation array or messages array
    const conversationTranscript = message.conversation || [];
    const messagesTranscript = message.messages || [];
    const transcript = conversationTranscript.length > 0 ? conversationTranscript : messagesTranscript;

    console.log('📞 Extracted conversation-update data:', {
      callId,
      customerPhone,
      assistantPhone,
      conversationLength: conversationTranscript.length,
      messagesLength: messagesTranscript.length,
      transcriptLength: transcript.length
    });

    if (!customerPhone || !assistantPhone) {
      console.error('❌ Missing phone numbers in conversation-update');
      return NextResponse.json({ success: true });
    }

    // Normalize phone numbers for matching (handle format differences)
    // Extract last 10 digits from both numbers for flexible matching
    const assistantDigits = assistantPhone.replace(/\D/g, '').slice(-10);
    
    // Find all detailers and check phone numbers flexibly
    const detailers = await prisma.detailer.findMany({
      where: {
        twilioPhoneNumber: { not: null }
      }
    });
    
    let detailer = detailers.find(d => {
      if (!d.twilioPhoneNumber) return false;
      const detailerDigits = d.twilioPhoneNumber.replace(/\D/g, '').slice(-10);
      return detailerDigits === assistantDigits;
    });

    if (!detailer) {
      console.error('❌ Detailer not found for phone:', assistantPhone);
      console.log('🔍 Searched for last 10 digits:', assistantDigits);
      console.log('🔍 Available detailers:', detailers.map(d => ({
        id: d.id,
        businessName: d.businessName,
        twilioPhoneNumber: d.twilioPhoneNumber,
        last10Digits: d.twilioPhoneNumber?.replace(/\D/g, '').slice(-10)
      })));
      return NextResponse.json({ success: true });
    }

    console.log('✅ Found detailer:', { id: detailer.id, businessName: detailer.businessName, phone: detailer.twilioPhoneNumber });

    // Normalize phone number
    const { normalizeToE164 } = await import('@/lib/phone');
    const normalizedCustomerPhone = normalizeToE164(customerPhone) || customerPhone;

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: normalizedCustomerPhone
        }
      }
    });

    if (!conversation) {
      console.log('📞 Creating new conversation for phone call');
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: normalizedCustomerPhone,
          status: 'active',
          channel: 'phone',
          lastMessageAt: new Date(),
        }
      });
      console.log('✅ Created conversation:', conversation.id);
    } else {
      // Update conversation channel if it's primarily phone
      if (conversation.channel !== 'phone') {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { channel: 'phone', lastMessageAt: new Date() }
        });
      }
    }

    // Store transcript messages
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      console.log(`📝 Processing ${transcript.length} transcript messages from conversation-update`);
      
      let storedCount = 0;
      for (const msg of transcript) {
        // Handle different message formats
        const role = msg.role; // 'user', 'assistant', 'bot', 'system'
        let content = msg.content || msg.message || '';
        const timestamp = msg.timestamp || msg.time || msg.createdAt || new Date();

        // Skip system messages
        if (role === 'system' || !content || !content.trim()) {
          continue;
        }

        // Map role to direction
        let direction: 'inbound' | 'outbound';
        if (role === 'user') {
          direction = 'inbound';
        } else if (role === 'assistant' || role === 'bot') {
          direction = 'outbound';
        } else {
          continue; // Skip other roles
        }

        // Check if message already exists
        const existingMessage = await prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            vapiCallId: callId,
            content: content.trim(),
            direction: direction,
            channel: 'phone'
          }
        });

        if (!existingMessage) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: direction,
              content: content.trim(),
              channel: 'phone',
              vapiCallId: callId,
              status: direction === 'inbound' ? 'received' : 'sent',
              createdAt: timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now())
            }
          });
          storedCount++;
        }
      }

      console.log(`✅ Stored ${storedCount} new messages from conversation-update for call ${callId}`);
      
      // Update conversation metadata
      const metadata = (conversation.metadata as any) || {};
      metadata.lastCallId = callId;
      metadata.lastConversationUpdate = new Date().toISOString();

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          metadata: metadata,
          lastMessageAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Vapi conversation-update:', error);
    return NextResponse.json({ success: true });
  }
}

function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

async function handleCalendarSlots(functionName: string, parameters: any, call: any) {
  const { date } = parameters;
  
  try {
    // Find detailer by the Twilio phone number that Vapi is using for THIS call
    const assistantNumber = call?.assistant?.phoneNumber || call?.assistant?.number || '';
    const lookupNumber = assistantNumber || process.env.TWILIO_PHONE_NUMBER || '';
    
    console.log('Calendar slots request:', { 
      functionName, 
      assistantNumber, 
      lookupNumber, 
      date 
    });

    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: lookupNumber
      }
    });
    
    if (!detailer) {
      return NextResponse.json({
        result: 'Sorry, I could not find the business information. Please try again.'
      });
    }

    // Extract duration from function name (e.g., "calendar_slots_2" -> 2 hours)
    const durationMatch = functionName.match(/calendar_slots_(\d+(?:\.\d+)?)/);
    const duration = durationMatch ? parseFloat(durationMatch[1]) : 2; // Default to 2 hours

    // Get business hours for the requested date
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[dayOfWeek];
    const businessHours = detailer.businessHours?.[dayName];

    if (!businessHours || !Array.isArray(businessHours) || businessHours.length === 0) {
      return NextResponse.json({
        result: `Sorry, I'm not available on ${dayName}s. Please choose a different day.`
      });
    }

    // Generate available slots within business hours
    const availableSlots = [];
    const startHour = parseInt(businessHours[0].split(':')[0]);
    const endHour = parseInt(businessHours[1].split(':')[0]);
    const businessDuration = endHour - startHour;

    console.log('Calendar slots debug:', {
      functionName,
      date,
      startHour,
      endHour,
      businessDuration,
      duration,
      businessHours
    });

    // Check if the requested duration fits within business hours
    if (duration > businessDuration) {
      return NextResponse.json({
        result: `Sorry, I don't have any ${duration}-hour slots available on ${date}. My business hours are only ${businessDuration} hours long. Please choose a shorter service or a different day.`
      });
    }

    // Generate slots every 30 minutes within business hours
    for (let hour = startHour; hour < endHour - duration + 0.5; hour += 0.5) {
      const timeString = `${Math.floor(hour).toString().padStart(2, '0')}:${hour % 1 === 0 ? '00' : '30'}`;
      availableSlots.push({
        time: timeString,
        duration: duration,
        available: true
      });
    }

    if (availableSlots.length === 0) {
      return NextResponse.json({
        result: `Sorry, I don't have any ${duration}-hour slots available on ${date}. Please choose a different day.`
      });
    }

    // Return the first available slot with proper formatting
    const firstSlot = availableSlots[0];
    const time12Hour = convertTo12Hour(firstSlot.time);
    const dayNameFormatted = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    
    return NextResponse.json({
      result: `I have a ${duration}-hour slot available on ${dayNameFormatted}, ${monthDay} at ${time12Hour}. Does that work for you?`
    });

  } catch (error) {
    console.error('Calendar slots error:', error);
    return NextResponse.json({
      result: 'Sorry, I had trouble checking my calendar. Please try again.'
    });
  }
}
