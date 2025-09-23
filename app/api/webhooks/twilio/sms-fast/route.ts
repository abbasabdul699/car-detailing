import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHints } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== FAST SMS WEBHOOK START ===');
    
    const formData = await request.formData();
    const fromRaw = formData.get('From') as string;
    const toRaw = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const from = normalizeToE164(fromRaw) || fromRaw;
    const to = normalizeToE164(toRaw) || toRaw;
    
    console.log('Fast - Incoming message:', { from, to, body, messageSid });
    
    // Find the detailer quickly
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Find or create conversation
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
          take: 5 // Only get last 5 messages for faster processing
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
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
      });
    }

    // Store incoming message
    const inbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    // Get detailer's available services from MongoDB
    const detailerServices = await prisma.detailerService.findMany({
      where: { detailerId: detailer.id },
      include: { service: true }
    })
    const availableServices = detailerServices.map(ds => ds.service.name).join(', ')

    // Update snapshot with any hints from this message
    const inferred = extractSnapshotHints(body || '', detailerServices.map(ds => ds.service.name))
    if (Object.keys(inferred).length > 0) {
      await upsertCustomerSnapshot(detailer.id, from, inferred)
    }

    // Load snapshot for context
    const snapshot = await getCustomerSnapshot(detailer.id, from)

    // Check availability for today and next few days
    const today = new Date();
    const availabilityData = [];
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      try {
        const availabilityResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/availability?detailerId=${detailer.id}&date=${dateStr}&duration=120`
        );
        if (availabilityResponse.ok) {
          const availability = await availabilityResponse.json();
          availabilityData.push(availability);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      }
    }

    // Generate conversational AI response
    const recentMessages = conversation.messages || [];
    const conversationHistory = recentMessages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Format availability data for the AI
    const availabilitySummary = availabilityData.map(day => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const availableTimes = day.availableSlots.slice(0, 5).map(slot => slot.timeString).join(', ');
      return `${dayName}: ${availableTimes || 'No availability'}`;
    }).join('\n');

    const systemPrompt = `You are a friendly, conversational AI assistant for ${detailer.businessName}, a mobile car detailing service. 

IMPORTANT: Be conversational, engaging, and natural. Don't give generic responses. Respond like a real person would.

BOOKING SEQUENCE: When someone wants to book, ALWAYS start by asking "What's your name?" first, then follow the order: car details, services, address, date/time.

Business: ${detailer.businessName}
${detailer.city && detailer.state ? `Location: ${detailer.city}, ${detailer.state}` : ''}
Business Hours: ${JSON.stringify(detailer.businessHours)}
Available Services: ${availableServices || 'Various car detailing services'}

Known customer context (if any):
Name: ${snapshot?.customerName || 'unknown'}
Vehicle: ${snapshot?.vehicle || [snapshot?.vehicleYear, snapshot?.vehicleMake, snapshot?.vehicleModel].filter(Boolean).join(' ') || 'unknown'}
Service Address: ${snapshot?.address || 'unknown'}
Services: ${snapshot?.services?.join(', ') || 'unknown'}

REAL-TIME AVAILABILITY:
${availabilitySummary}

IMPORTANT: Use the known information above. If you already know their name, vehicle, or address, don't ask for it again. Only ask for information you don't have yet.

When customers ask about services:
- Be enthusiastic and helpful
- Ask follow-up questions
- Make it feel like a real conversation
- Don't repeat the same response

When booking, follow this order but ONLY ask for information you don't already know:
1. If you don't know their name, ask "What's your name?"
2. If you don't know their vehicle, ask about their car (make, model, year)
3. If you don't know what services they want, ask what services they're interested in
4. If you don't know their FULL address, ask for their COMPLETE address where they want the mobile service
5. If you don't know their preferred date, ask "What date would work for you?"
6. If you don't know their preferred time, ask about their preferred time

SERVICES REQUIREMENTS:
- If you already know their services (like "interior detail"), don't ask for services again
- Use the known services information to confirm what they want
- Only ask for services if you don't have this information yet
- ONLY suggest services from the "Available Services" list above
- If a customer asks for a service not in the available services, politely explain what services you actually offer
- Never suggest services that aren't in the detailer's available services list

ADDRESS REQUIREMENTS:
- Always ask for the COMPLETE address (street number, street name, city, state, ZIP)
- If they only give a city like "Needham", ask "What's your full address in Needham?"
- Never accept just a city name as sufficient address information

DATE REQUIREMENTS:
- Always ask for the specific date before confirming any time
- If they say "9 PM" without a date, ask "What date would you like the 9 PM appointment?"
- Don't assume "today" or "tomorrow" - always ask for clarification

AVAILABILITY GUIDANCE:
- Use the REAL-TIME AVAILABILITY data above to suggest specific available times
- Only suggest times that are actually available according to the business hours and calendar
- If someone asks for a time outside business hours, politely explain the business hours
- If they want a time that's not available, suggest the closest available alternative
- Always confirm the exact date AND time slot before finalizing the booking

CRITICAL: Don't ask for information you already have. Use the known context above.

CRITICAL: This is a MOBILE service - we come to the customer's location. Always ask for their specific address where they want the service performed. Never assume a location or mention a specific city unless the customer has already provided their address.

IMPORTANT: This is a MOBILE service. We come to the customer's location. Never mention "our shop" or "our location" - always ask for their address where they want the service performed.

Be conversational and natural - ask one or two questions at a time, not everything at once. Make it feel like a real person having a conversation.

NEVER mention specific cities like "Boston" unless the customer has already provided their address. Always ask for their address without assuming any location.

Keep responses under 160 characters and conversational.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: body }
        ],
        max_tokens: 120, // Slightly longer for more natural responses
        temperature: 0.9, // More creative and conversational
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Hey! Thanks for reaching out! What can I help you with today?';

    console.log('AI Response:', aiResponse);

    // Send response immediately
    let twilioSid: string | undefined
    const sendDisabled = process.env.TWILIO_SEND_DISABLED === '1'
    const hasTwilioCreds = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN
    if (!sendDisabled && hasTwilioCreds) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const tw = await client.messages.create({ to: from, from: to, body: aiResponse })
      // After sending the first AI message in a conversation, send vCard once if not sent
      const snapshot = await getCustomerSnapshot(detailer.id, from)
      if (!snapshot?.vcardSent) {
        const vcardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/vcard?detailerId=${detailer.id}`
        try {
          console.log('Sending MMS vCard to:', from, 'URL:', vcardUrl)
          // Send MMS with vCard attachment
          const mmsResponse = await client.messages.create({ 
            to: from, 
            from: to, 
            body: `Save our contact! 📇`,
            mediaUrl: [vcardUrl]
          })
          console.log('MMS sent successfully:', mmsResponse.sid)
          await upsertCustomerSnapshot(detailer.id, from, { data: null, customerName: snapshot?.customerName ?? null, address: snapshot?.address ?? null, vehicle: snapshot?.vehicle ?? null, vehicleYear: snapshot?.vehicleYear ?? null, vehicleMake: snapshot?.vehicleMake ?? null, vehicleModel: snapshot?.vehicleModel ?? null })
          await prisma.customerSnapshot.update({ where: { detailerId_customerPhone: { detailerId: detailer.id, customerPhone: from } }, data: { vcardSent: true } })
        } catch (mmsError) {
          console.error('MMS failed, falling back to SMS:', mmsError)
          // Fallback: send as SMS with link
          await client.messages.create({
            to: from,
            from: to,
            body: `Save our contact: ${vcardUrl}`
          })
          await prisma.customerSnapshot.update({ where: { detailerId_customerPhone: { detailerId: detailer.id, customerPhone: from } }, data: { vcardSent: true } })
        }
      }
      twilioSid = tw.sid
    }

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse,
        twilioSid: twilioSid,
        status: twilioSid ? 'sent' : 'simulated',
      },
    });

    console.log('=== FAST SMS WEBHOOK SUCCESS ===');
    if (twilioSid) console.log('Response sent:', twilioSid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      twilioSid: twilioSid
    });

  } catch (error) {
    console.error('=== FAST SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Fast webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
