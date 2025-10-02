import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';
import { getCustomerSnapshot, upsertCustomerSnapshot } from '@/lib/customerSnapshot';
import { getOrCreateCustomer, extractCustomerDataFromSnapshot } from '@/lib/customer';
import { validateVehicle, normalizeModel, generateVehicleClarification } from '@/lib/vehicleValidation';
import { validateAndNormalizeState } from '@/lib/stateValidation';

// Voice AI conversation state management
interface VoiceState {
  step: 'greeting' | 'name' | 'vehicle' | 'services' | 'address' | 'date' | 'time' | 'email' | 'confirmation' | 'complete';
  customerName?: string;
  vehicle?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  services?: string[];
  address?: string;
  locationType?: 'home' | 'work' | 'other';
  preferredDate?: string;
  preferredTime?: string;
  customerEmail?: string;
  isFirstTime?: boolean;
  conversationId?: string;
  detailerId?: string;
}

// ElevenLabs voice synthesis
async function synthesizeVoice(text: string, voiceId: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('ElevenLabs synthesis error:', error);
    return '';
  }
}

// Generate TwiML response for voice
function generateTwiMLResponse(sayText: string, audioUrl?: string): string {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  
  if (audioUrl) {
    twiml += `<Play>${audioUrl}</Play>`;
  } else {
    twiml += `<Say voice="alice">${sayText}</Say>`;
  }
  
  twiml += '<Record maxLength="30" action="/api/webhooks/voice/process" method="POST" finishOnKey="#"/>';
  twiml += '</Response>';
  
  return twiml;
}

// Process voice input and generate response
async function processVoiceInput(state: VoiceState, userInput: string, detailer: any): Promise<{ response: string; newState: VoiceState; isComplete: boolean }> {
  const lowerInput = userInput.toLowerCase().trim();
  let response = '';
  let newState = { ...state };
  let isComplete = false;

  console.log('Processing voice input:', { step: state.step, input: userInput });

  switch (state.step) {
    case 'greeting':
      if (state.isFirstTime) {
        response = `Hi! I'm calling from ${detailer.businessName}. I received your interest in our mobile car detailing services. To help you book an appointment, I'll need to collect some information. Is that okay with you?`;
        newState.step = 'name';
      } else {
        response = `Hi ${state.customerName || 'there'}! This is ${detailer.businessName}. How can I help you today?`;
        newState.step = 'name';
      }
      break;

    case 'name':
      if (lowerInput.includes('yes') || lowerInput.includes('okay') || lowerInput.includes('sure')) {
        response = `Great! What's your name?`;
        newState.step = 'name';
      } else if (userInput.trim().length > 0) {
        newState.customerName = userInput.trim();
        response = `Nice to meet you, ${newState.customerName}! What kind of vehicle do you have? Please tell me the year, make, and model.`;
        newState.step = 'vehicle';
      } else {
        response = `I didn't catch that. Could you please tell me your name?`;
      }
      break;

    case 'vehicle':
      if (userInput.trim().length > 0) {
        newState.vehicle = userInput.trim();
        
        // Try to parse vehicle details
        const vehicleMatch = userInput.match(/(\d{4})\s+(\w+)\s+(.+)/i);
        if (vehicleMatch) {
          newState.vehicleYear = parseInt(vehicleMatch[1]);
          newState.vehicleMake = vehicleMatch[2];
          newState.vehicleModel = vehicleMatch[3];
        }
        
        response = `Perfect! A ${newState.vehicle}. What services are you interested in? We offer interior detailing, exterior wash, ceramic coating, and full detail packages.`;
        newState.step = 'services';
      } else {
        response = `I didn't catch that. Could you tell me about your vehicle - the year, make, and model?`;
      }
      break;

    case 'services':
      if (userInput.trim().length > 0) {
        const services = [];
        const input = userInput.toLowerCase();
        
        if (input.includes('interior')) services.push('Interior Detail');
        if (input.includes('exterior')) services.push('Exterior Wash');
        if (input.includes('ceramic')) services.push('Ceramic Coating');
        if (input.includes('full') || input.includes('complete')) services.push('Full Detail');
        if (input.includes('wash')) services.push('Car Wash');
        
        newState.services = services.length > 0 ? services : ['Detailing'];
        
        response = `Excellent! ${newState.services.join(' and ')} sounds great. Where would you like us to perform the service? Please give me your complete address.`;
        newState.step = 'address';
      } else {
        response = `I didn't catch that. What services are you interested in?`;
      }
      break;

    case 'address':
      if (userInput.trim().length > 0) {
        newState.address = userInput.trim();
        response = `Got it! ${newState.address}. Is this your home, work, or another location?`;
        newState.step = 'date';
      } else {
        response = `I didn't catch that. Could you please give me your complete address?`;
      }
      break;

    case 'date':
      if (lowerInput.includes('home')) {
        newState.locationType = 'home';
      } else if (lowerInput.includes('work') || lowerInput.includes('office')) {
        newState.locationType = 'work';
      } else {
        newState.locationType = 'other';
      }
      
      response = `Perfect! What date would work best for you? You can say today, tomorrow, or a specific date.`;
      newState.step = 'time';
      break;

    case 'time':
      if (userInput.trim().length > 0) {
        newState.preferredDate = userInput.trim();
        response = `Great! What time would work best for you? You can say morning, afternoon, evening, or a specific time like 2 PM.`;
        newState.step = 'email';
      } else {
        response = `I didn't catch that. What date would work for you?`;
      }
      break;

    case 'email':
      if (userInput.trim().length > 0) {
        newState.preferredTime = userInput.trim();
        response = `Perfect! What's your email address? This is optional but helps us send you confirmations and reminders.`;
        newState.step = 'confirmation';
      } else {
        response = `I didn't catch that. What time would work for you?`;
      }
      break;

    case 'confirmation':
      if (userInput.trim().length > 0 && userInput.includes('@')) {
        newState.customerEmail = userInput.trim();
      }
      
      // Generate confirmation
      const dateStr = newState.preferredDate || 'your preferred date';
      const timeStr = newState.preferredTime || 'your preferred time';
      
      response = `Perfect! Let me confirm your appointment: ${newState.customerName}, ${newState.vehicle}, ${newState.services?.join(' and ')}, at ${newState.address}, on ${dateStr} at ${timeStr}. Does this sound correct?`;
      newState.step = 'complete';
      break;

    case 'complete':
      if (lowerInput.includes('yes') || lowerInput.includes('correct') || lowerInput.includes('perfect')) {
        response = `Excellent! Your appointment is confirmed. We'll send you a text confirmation shortly. Thank you for choosing ${detailer.businessName}!`;
        isComplete = true;
      } else {
        response = `Let me know if you'd like to change anything about your appointment.`;
      }
      break;
  }

  return { response, newState, isComplete };
}

// Create booking from voice conversation
async function createBookingFromVoice(state: VoiceState, detailerId: string, customerPhone: string, conversationId: string) {
  try {
    // Parse date
    let scheduledDate = new Date();
    if (state.preferredDate) {
      const lowerDate = state.preferredDate.toLowerCase();
      if (lowerDate.includes('tomorrow')) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      } else if (lowerDate.includes('today')) {
        // Keep current date
      } else {
        // Try to parse specific date
        const dateMatch = state.preferredDate.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
        if (dateMatch) {
          const month = parseInt(dateMatch[1]) - 1;
          const day = parseInt(dateMatch[2]);
          const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
          scheduledDate = new Date(year, month, day);
        }
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        detailerId: detailerId,
        conversationId: conversationId,
        customerPhone: customerPhone,
        customerName: state.customerName,
        customerEmail: state.customerEmail,
        vehicleType: state.vehicle,
        vehicleLocation: state.address,
        services: state.services || ['Detailing'],
        scheduledDate: scheduledDate,
        scheduledTime: state.preferredTime,
        status: 'pending',
        notes: `Voice booking - ${state.locationType || 'location'} - Auto-captured from voice conversation`
      }
    });

    // Create customer record
    if (state.customerName) {
      const customerData = {
        name: state.customerName,
        phone: customerPhone,
        email: state.customerEmail,
        address: state.address,
        locationType: state.locationType,
        vehicle: state.vehicle,
        source: 'Voice Call',
        notes: `Voice booking created - ${state.vehicle}`
      };
      
      await getOrCreateCustomer(detailerId, customerPhone, customerData);
    }

    // Create notification
    await prisma.notification.create({
      data: {
        detailerId: detailerId,
        message: `🎤 VOICE BOOKING: ${state.customerName} - ${state.vehicle}`,
        type: 'voice_booking',
        link: '/detailer-dashboard/bookings'
      }
    });

    console.log('Voice booking created:', booking.id);
    return booking;
  } catch (error) {
    console.error('Error creating voice booking:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = normalizeToE164(formData.get('From') as string) || formData.get('From') as string;
    const to = normalizeToE164(formData.get('To') as string) || formData.get('To') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Voice call received:', { from, to, callSid });

    // Find detailer
    const last10 = to.replace(/\D/g, '').slice(-10);
    const detailer = await prisma.detailer.findFirst({
      where: {
        smsEnabled: true,
        OR: [
          { twilioPhoneNumber: to },
          { twilioPhoneNumber: { contains: last10 } },
        ],
      },
    });

    if (!detailer) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured for voice calls.</Say><Hangup/></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Check if this is a new call or continuation
    const existingConversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
    });

    const isFirstTime = !existingConversation;
    let conversation = existingConversation;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Initialize voice state
    const voiceState: VoiceState = {
      step: 'greeting',
      isFirstTime,
      conversationId: conversation.id,
      detailerId: detailer.id
    };

    // Generate initial response
    const { response, newState, isComplete } = await processVoiceInput(voiceState, '', detailer);

    // Create notification for new voice call
    if (isFirstTime) {
      await prisma.notification.create({
        data: {
          detailerId: detailer.id,
          message: `📞 NEW VOICE CALL from ${from}`,
          type: 'voice_call',
          link: '/detailer-dashboard/messages',
        },
      });
    }

    // Store voice message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: `Voice call from ${from}`,
        twilioSid: callSid,
        status: 'received',
      },
    });

    // Generate TwiML response
    const twiml = generateTwiMLResponse(response);
    
    console.log('=== VOICE WEBHOOK SUCCESS ===');
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('=== VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error processing your call. Please try again later.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}

// Process voice input (called after recording)
export async function PUT(request: NextRequest) {
  try {
    console.log('=== VOICE PROCESSING START ===');
    
    const formData = await request.formData();
    const from = normalizeToE164(formData.get('From') as string) || formData.get('From') as string;
    const to = normalizeToE164(formData.get('To') as string) || formData.get('To') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const callSid = formData.get('CallSid') as string;
    
    // For now, we'll use a simple text response
    // In production, you'd want to integrate with speech-to-text service
    const userInput = "I want to book a car detailing service"; // Placeholder
    
    // Find detailer and conversation
    const last10 = to.replace(/\D/g, '').slice(-10);
    const detailer = await prisma.detailer.findFirst({
      where: {
        smsEnabled: true,
        OR: [
          { twilioPhoneNumber: to },
          { twilioPhoneNumber: { contains: last10 } },
        ],
      },
    });

    if (!detailer) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
    });

    if (!conversation) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, I couldn\'t find your conversation.</Say><Hangup/></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Process the voice input
    const voiceState: VoiceState = {
      step: 'greeting',
      conversationId: conversation.id,
      detailerId: detailer.id
    };

    const { response, newState, isComplete } = await processVoiceInput(voiceState, userInput, detailer);

    // If booking is complete, create it
    if (isComplete) {
      await createBookingFromVoice(newState, detailer.id, from, conversation.id);
    }

    // Store the response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: response,
        twilioSid: callSid,
        status: 'sent',
      },
    });

    const twiml = generateTwiMLResponse(response);
    
    console.log('=== VOICE PROCESSING SUCCESS ===');
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('=== VOICE PROCESSING ERROR ===');
    console.error('Error details:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error. Please try again.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}
