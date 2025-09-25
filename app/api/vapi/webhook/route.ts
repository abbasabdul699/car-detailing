import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    const { type, call } = body;

    if (type === 'assistant-request') {
      return handleAssistantRequest(body);
    }

    if (type === 'function-call') {
      return handleFunctionCall(body);
    }

    if (type === 'status-update') {
      return handleStatusUpdate(body);
    }

    if (type === 'end-of-call-report') {
      return handleEndOfCallReport(body);
    }

    // Default response for unknown types
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

You're having a natural phone conversation with a customer. Be friendly, helpful, and conversational.

When booking appointments, collect:
- Customer name and phone number
- Vehicle make, model, and year
- Preferred date and time
- Services needed
- Location/address

Use the available functions to check calendar availability and create bookings.

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
      result: 'Sorry, I had trouble checking availability. Please try again.'
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
  console.log('Vapi status update:', body);
  return NextResponse.json({ success: true });
}

async function handleEndOfCallReport(body: any) {
  console.log('Vapi end of call report:', body);
  return NextResponse.json({ success: true });
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
