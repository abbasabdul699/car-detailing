import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHintsSafe, safeUpsertSnapshot } from '@/lib/customerSnapshot';
import { getOrCreateCustomer, extractCustomerDataFromSnapshot } from '@/lib/customer';
import { synthesizeVoice, generateTwiMLResponse } from '@/lib/voiceAI';
import { formatDuration } from '@/lib/utils';

// Voice AI that uses the exact same workflow as SMS
export async function POST(request: NextRequest) {
  try {
    console.log('=== VOICE AI (SMS-STYLE) START ===');
    
    const formData = await request.formData();
    const from = normalizeToE164(formData.get('From') as string) || formData.get('From') as string;
    const to = normalizeToE164(formData.get('To') as string) || formData.get('To') as string;
    const userInput = formData.get('Digits') as string || formData.get('SpeechResult') as string || 'hello';
    const callSid = formData.get('CallSid') as string;
    
    console.log('Voice call received:', { from, to, userInput, callSid });

    // Find detailer (same as SMS)
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

    // Find or create conversation (same as SMS)
    let conversation = await prisma.conversation.findUnique({
      where: {
        detailerId_customerPhone: {
          detailerId: detailer.id,
          customerPhone: from,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 20 }
        }
      });

      // Create notification for new voice call
      await prisma.notification.create({
        data: {
          detailerId: detailer.id,
          message: `📞 NEW VOICE CALL from ${from}`,
          type: 'voice_call',
          link: '/detailer-dashboard/messages',
        },
      });
    }

    // Store incoming voice message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: `Voice: ${userInput}`,
        twilioSid: callSid,
        status: 'received',
      },
    });

    // Get detailer's available services (same as SMS)
    const detailerServices = await prisma.detailerService.findMany({
      where: { detailerId: detailer.id },
      include: { 
        service: {
          include: {
            category: true
          }
        }
      }
    });
    
    // Group services by category (same as SMS)
    const servicesByCategory = detailerServices.reduce((acc, ds) => {
      const category = ds.service.category?.name || 'Other'
      if (!acc[category]) acc[category] = []
      
      const serviceAny = ds.service as any
      let serviceInfo = ds.service.name
      const details: string[] = []
      if (serviceAny?.priceRange) {
        details.push(serviceAny.priceRange)
      } else if (typeof serviceAny?.basePrice === 'number') {
        const formattedBase = Number.isInteger(serviceAny.basePrice)
          ? serviceAny.basePrice.toString()
          : serviceAny.basePrice.toFixed(2)
        details.push(`$${formattedBase}`)
      }
      if (typeof serviceAny?.duration === 'number' && serviceAny.duration > 0) {
        details.push(formatDuration(serviceAny.duration))
      }
      if (details.length) {
        serviceInfo += ` (${details.join(', ')})`
      }
      
      acc[category].push(serviceInfo)
      return acc
    }, {} as Record<string, string[]>);
    
    const availableServices = Object.entries(servicesByCategory)
      .map(([category, services]) => `${category}: ${services.join(', ')}`)
      .join(' | ');

    // Check if this is a first-time customer (same as SMS)
    const existingSnapshot = await getCustomerSnapshot(detailer.id, from);
    const hasPreviousMessages = conversation && conversation.messages && conversation.messages.length > 1;
    const isFirstTimeCustomer = !existingSnapshot && !hasPreviousMessages;
    
    console.log('DEBUG: isFirstTimeCustomer:', isFirstTimeCustomer);
    console.log('DEBUG: existingSnapshot:', existingSnapshot);

    // Update snapshot with any hints from this message (same as SMS)
    const inferred = extractSnapshotHintsSafe(userInput || '', detailerServices.map(ds => ds.service.name));
    
    // If no name was extracted from current message, try to extract from conversation history
    if (!inferred.customerName && conversation?.messages) {
      // Simple name extraction for voice
      for (const msg of conversation.messages) {
        if (msg.direction === 'inbound' && msg.content) {
          const nameMatch = msg.content.match(/my name is (\w+)/i) || msg.content.match(/i'm (\w+)/i);
          if (nameMatch) {
            inferred.customerName = nameMatch[1];
            break;
          }
        }
      }
    }
    
    const snapshot = await safeUpsertSnapshot(detailer.id, from, inferred);

    // Format business hours (same as SMS)
    const formatBusinessHours = (businessHours: any) => {
      if (!businessHours) return 'Business hours not specified';
      
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      
      let hoursText = '';
      for (let i = 0; i < dayKeys.length; i++) {
        const day = dayKeys[i];
        const dayName = dayNames[i];
        if (businessHours[day] && businessHours[day].length >= 2) {
          const open = businessHours[day][0];
          const close = businessHours[day][1];
          hoursText += `${dayName}: ${open} - ${close}\n`;
        }
      }
      
      return hoursText || 'Business hours not specified';
    };

    // Build customer context for returning customers (same as SMS)
    let customerContext = '';
    if (!isFirstTimeCustomer && existingSnapshot) {
      const hasName = existingSnapshot.customerName && existingSnapshot.customerName.trim() !== ''
      const hasAddress = existingSnapshot.address && existingSnapshot.address.trim() !== ''
      const hasVehicle = existingSnapshot.vehicle && existingSnapshot.vehicle.trim() !== ''
      const hasEmail = existingSnapshot.customerEmail && existingSnapshot.customerEmail.trim() !== ''
      
      customerContext = `\n\nRETURNING CUSTOMER - USE EXISTING INFORMATION:
${hasName ? `Name: ${existingSnapshot.customerName}` : 'Name: Not provided'}
${hasEmail ? `Email: ${existingSnapshot.customerEmail}` : 'Email: Not provided'}  
${hasVehicle ? `Vehicle: ${existingSnapshot.vehicle}` : 'Vehicle: Not provided'}
${hasAddress ? `Address: ${existingSnapshot.address}` : 'Address: Not provided'}
Location Type: ${existingSnapshot.locationType || 'Not specified'}

CRITICAL RULES FOR RETURNING CUSTOMERS:
1. DO NOT ask for information you already have above
2. ${hasName ? `Always use "${existingSnapshot.customerName}" as their name` : 'Ask for name if not provided'}
3. ${hasAddress ? `Use "${existingSnapshot.address}" as their address - DO NOT ask again` : 'Ask for address if not provided'}
4. ${hasVehicle ? `Use "${existingSnapshot.vehicle}" as their vehicle - DO NOT ask again` : 'Ask for vehicle if not provided'}
5. ${hasEmail ? `Use "${existingSnapshot.customerEmail}" for confirmations` : 'Ask for email only if needed for confirmations'}`;
    }

    // Check for existing bookings (same as SMS)
    let availabilityInfo = '';
    try {
      const existingBookings = await prisma.booking.findMany({
        where: {
          detailerId: detailer.id,
          scheduledDate: {
            gte: new Date(),
            lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          status: {
            not: 'cancelled'
          }
        },
        select: {
          scheduledDate: true,
          scheduledTime: true,
          customerName: true,
          status: true
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      });

      if (existingBookings.length > 0) {
        availabilityInfo = `\n\nEXISTING APPOINTMENTS (next 30 days):\n`;
        existingBookings.forEach(booking => {
          const date = new Date(booking.scheduledDate);
          const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          });
          availabilityInfo += `- ${dateStr} at ${booking.scheduledTime}: ${booking.customerName || 'Customer'}\n`;
        });
      } else {
        availabilityInfo = `\n\nCURRENT AVAILABILITY: No existing appointments in the next 30 days. All time slots are available.`;
      }
    } catch (error) {
      console.error('Error fetching existing bookings for AI context:', error);
      availabilityInfo = `\n\nCURRENT AVAILABILITY: Unable to check existing appointments. Proceed with normal booking flow.`;
    }

    // Create the same system prompt as SMS but adapted for voice
    const systemPrompt = `You are Arian from ${detailer.businessName}, a mobile car detailing service. You are now having a VOICE conversation with a customer.

🎯 MISSION: Help customers book services efficiently through voice conversation. Be conversational and natural.

⚡ VOICE CONVERSATION RULES:
- Speak naturally and conversationally
- Ask one question at a time
- Be patient with voice input
- Repeat back important information
- Keep responses concise for voice

📋 VOICE BOOKING FLOW:
1. Greet and get their name
2. Ask about their vehicle (year, make, model)
3. Ask what services they need
4. Get their complete address
5. Ask for date and time preferences
6. Get email (optional)
7. Confirm all details
8. Create booking

${isFirstTimeCustomer ? `COMPLIANCE REQUIREMENT: This is a first-time customer. You MUST start by asking for consent before any business conversation. Say: "Hi! I'm Arian from ${detailer.businessName}. To help you book your mobile car detailing service, I'll need to send you appointment confirmations and updates via SMS. Is that okay with you?" Only proceed with booking after they agree.` : ''}

BOOKING SEQUENCE: 
- For NEW customers: Ask "What's your name?" first, then follow the order: car details, services, address, date/time.
- For RETURNING customers: Use their existing information from the RETURNING CUSTOMER INFORMATION section above. Only ask for NEW details (like different service or date/time). NEVER ask for information you already have.

CRITICAL: If you see "RETURNING CUSTOMER" information above, you MUST use that information. Do NOT ask for name, address, vehicle, or email if they're already provided in that section.

Business: ${detailer.businessName}
${detailer.city && detailer.state ? `Location: ${detailer.city}, ${detailer.state}` : ''}
Business Hours:
${formatBusinessHours(detailer.businessHours)}

IMPORTANT: You MUST follow the business hours exactly as specified above. Do not make up or assume different hours.${availabilityInfo}${customerContext}

Available Services: ${availableServices || 'Various car detailing services'}

Known customer context (if any):
Name: ${snapshot?.customerName || 'unknown'}
Vehicle: ${snapshot?.vehicle || [snapshot?.vehicleYear, snapshot?.vehicleMake, snapshot?.vehicleModel].filter(Boolean).join(' ') || 'unknown'}
Service Address: ${snapshot?.address || 'unknown'}
Services: ${snapshot?.services?.join(', ') || 'unknown'}

IMPORTANT: Use the known information above. If you already know their name, vehicle, or address, don't ask for it again. Only ask for information you don't have yet.

Be conversational and natural - this is a voice conversation, so speak naturally and be patient with voice input.`;

    // Use the same OpenAI integration as SMS
    let aiResponse = 'Hello! Thanks for calling! What can I help you with today?';
    
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ];
      
      console.log('DEBUG: Sending voice input to OpenAI:', { userInput });
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-2024-07-18',
          messages,
          max_tokens: 200,
          temperature: 0.7,
        }),
      });
      
      clearTimeout(timeout)
      
      if (response.ok) {
        const data = await response.json();
        if (data.choices?.length && data.choices[0].message?.content?.trim()) {
          aiResponse = data.choices[0].message.content.trim()
          console.log('DEBUG: OpenAI voice response:', aiResponse);
        }
      }
    } catch (error) {
      console.error('OpenAI voice call failed:', error);
      aiResponse = "I'm having trouble understanding. Could you please repeat?";
    }

    // Check if this is a booking confirmation (same as SMS)
    const lowerResponse = aiResponse.toLowerCase();
    const isBookingConfirmation = (lowerResponse.includes('perfect') && lowerResponse.includes('here\'s') && lowerResponse.includes('confirmation')) ||
                                 (lowerResponse.includes('booking confirmation') && lowerResponse.includes('name:') && lowerResponse.includes('date:')) ||
                                 (lowerResponse.includes('confirmed') && lowerResponse.includes('name:') && lowerResponse.includes('date:'));
    
    if (isBookingConfirmation) {
      // Create booking (same as SMS)
      try {
        const when = new Date();
        const services = Array.isArray(snapshot?.services) ? snapshot?.services as string[] : ['Detailing'];
        
        const booking = await prisma.booking.create({
          data: {
            detailerId: detailer.id,
            conversationId: conversation.id,
            customerPhone: from,
            customerName: snapshot?.customerName || undefined,
            customerEmail: snapshot?.customerEmail || undefined,
            vehicleType: snapshot?.vehicle || [snapshot?.vehicleYear, snapshot?.vehicleMake, snapshot?.vehicleModel].filter(Boolean).join(' ') || undefined,
            vehicleLocation: snapshot?.address || undefined,
            services: services.length ? services : ['Detailing'],
            scheduledDate: when,
            scheduledTime: snapshot?.preferredTime || undefined,
            status: 'pending',
            notes: 'Auto-captured from voice conversation'
          }
        });

        // Create customer record
        if (snapshot?.customerName) {
          const customerData = extractCustomerDataFromSnapshot(snapshot);
          await getOrCreateCustomer(detailer.id, from, customerData);
        }

        // Create notification
        await prisma.notification.create({
          data: {
            detailerId: detailer.id,
            message: `🎤 VOICE BOOKING: ${snapshot?.customerName || 'Customer'} - ${snapshot?.vehicle || 'Vehicle'}`,
            type: 'voice_booking',
            link: '/detailer-dashboard/bookings'
          }
        });

        console.log('Voice booking created:', booking.id);
      } catch (error) {
        console.error('Error creating voice booking:', error);
      }
    }

    // Generate voice audio
    let audioUrl: string | undefined;
    try {
      audioUrl = await synthesizeVoice(aiResponse);
    } catch (error) {
      console.error('Error generating voice audio:', error);
    }

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        twilioSid: callSid,
        status: 'sent',
      },
    });

    // Generate TwiML response
    const twiml = generateTwiMLResponse(aiResponse, audioUrl, !isBookingConfirmation);
    
    console.log('=== VOICE AI (SMS-STYLE) SUCCESS ===');
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('=== VOICE AI (SMS-STYLE) ERROR ===');
    console.error('Error details:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error processing your call. Please try again later.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}
