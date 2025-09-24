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
    if (name === 'check_availability') {
      return await checkAvailability(parameters);
    }
    
    if (name === 'create_booking') {
      return await createBooking(parameters, call);
    }

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

async function checkAvailability(parameters: any) {
  const { date, time } = parameters;
  
  try {
    // Call your n8n workflow for availability checking
    const n8nResponse = await fetch(`${process.env.N8N_WEBHOOK_URL}/calendar_availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        time,
        action: 'check_availability'
      })
    });

    if (!n8nResponse.ok) {
      throw new Error('n8n workflow failed');
    }

    const n8nData = await n8nResponse.json();

    if (n8nData.available) {
      return NextResponse.json({
        result: `Great! ${date} at ${time} is available. Would you like to book this time slot?`
      });
    } else {
      return NextResponse.json({
        result: `Sorry, ${date} at ${time} is not available. ${n8nData.reason || 'Please choose a different time.'}`
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
    // Call your n8n workflow for booking creation
    const n8nResponse = await fetch(`${process.env.N8N_WEBHOOK_URL}/calendar_set_appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerPhone,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        services,
        scheduledDate,
        scheduledTime,
        address,
        action: 'create_booking'
      })
    });

    if (!n8nResponse.ok) {
      throw new Error('n8n workflow failed');
    }

    const n8nData = await n8nResponse.json();

    if (n8nData.success) {
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
