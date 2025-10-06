import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHints } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import twilio from 'twilio';

// Helper function to call OpenAI API for AI responses
async function getAIResponse(messages: any[], detailerInfo: any, conversationHistory: any[] = []) {
  try {
    const systemPrompt = `You are an AI assistant for ${detailerInfo.businessName}, a mobile car detailing service. Your role is to help customers book appointments, modify existing bookings, and answer questions about services.

Business Information:
- Business Name: ${detailerInfo.businessName}
- Location: ${detailerInfo.city}, ${detailerInfo.state}
- Services: ${detailerInfo.services?.map((s: any) => s.service?.name).join(', ') || 'Various car detailing services'}

Customer Information Available:
${detailerInfo.snapshot ? `
- Customer Name: ${detailerInfo.snapshot.customerName || 'Not provided'}
- Vehicle: ${detailerInfo.snapshot.vehicle || 'Not specified'}
- Address: ${detailerInfo.snapshot.address || 'Not provided'}
- Services Requested: ${detailerInfo.snapshot.services?.join(', ') || 'Not specified'}
` : '- No customer information available yet'}

Your capabilities:
1. Help customers book new appointments
2. Update existing bookings (change service, time, date)
3. Answer questions about services and pricing
4. Provide information about availability
5. Collect necessary details for booking (date, time, vehicle type, services needed, service address)

When booking appointments:
- ALWAYS use the customer's name if available: ${detailerInfo.snapshot?.customerName || 'Ask for their name'}
- Ask for preferred date and time
- Ask about the vehicle (type, model, year) if not already provided
- Ask what services they need if not already specified
- Ask for their address (where they want the mobile service performed) if not already provided
- Confirm all details before finalizing
- DO NOT ask for email address - it's not required for booking

When customers want to change their booking:
- Acknowledge what they want to change (service, time, date)
- Confirm the new details
- Let them know the changes have been made
- Provide updated booking summary

IMPORTANT: This is a MOBILE service. We come to the customer's location. Never mention "our shop" or "our location" - always ask for their address where they want the service performed.

Be friendly, professional, and helpful. Keep responses concise but informative. Always address customers by name when you know it.`;

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

// Helper function to detect booking update requests
function detectBookingUpdate(messages: any[]) {
  const recentMessages = messages.slice(-5); // Last 5 messages for context
  const text = recentMessages.map(m => m.content).join(' ').toLowerCase();
  
  console.log('=== DETECTING BOOKING UPDATE ===');
  console.log('Recent messages text:', text);
  
  // Update patterns
  const updatePatterns = [
    /change.*service/i,
    /change.*appointment/i,
    /change.*booking/i,
    /update.*service/i,
    /update.*appointment/i,
    /update.*booking/i,
    /modify.*service/i,
    /modify.*appointment/i,
    /modify.*booking/i,
    /reschedule/i,
    /change.*time/i,
    /change.*date/i,
    /change.*to.*exterior/i,
    /change.*to.*interior/i,
    /change.*to.*full/i,
    /want.*change/i,
    /need.*change/i,
    /instead.*of/i,
    /rather.*than/i,
    /cancel.*and.*book/i,
    /start.*fresh/i,
    /new.*appointment/i,
    /new.*booking/i
  ];
  
  const isUpdateRequest = updatePatterns.some(pattern => pattern.test(text));
  console.log('Is booking update request:', isUpdateRequest);
  
  // Extract what they want to change
  let changeType = null;
  let newService = null;
  let newDate = null;
  let newTime = null;
  
  if (isUpdateRequest) {
    // Detect service change
    if (/change.*to.*exterior/i.test(text)) {
      changeType = 'service';
      newService = 'Exterior Detailing';
    } else if (/change.*to.*interior/i.test(text)) {
      changeType = 'service';
      newService = 'Interior Cleaning';
    } else if (/change.*to.*full/i.test(text)) {
      changeType = 'service';
      newService = 'Full Detail';
    }
    
    // Detect time change
    const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (timeMatch) {
      changeType = changeType || 'time';
      newTime = timeMatch[1];
    }
    
    // Detect date change
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dateMatch) {
      changeType = changeType || 'date';
      newDate = dateMatch[1];
    }
  }
  
  const result = {
    isUpdateRequest,
    changeType,
    newService,
    newDate,
    newTime
  };
  
  console.log('Booking update detection result:', result);
  console.log('=== END DETECTING BOOKING UPDATE ===');
  
  return result;
}

// Helper function to extract booking information from messages
function extractBookingInfo(messages: any[]) {
  const recentMessages = messages.slice(-10);
  const text = recentMessages.map(m => m.content).join(' ').toLowerCase();
  
  console.log('=== EXTRACTING BOOKING INFO ===');
  console.log('Recent messages text:', text);
  
  // Enhanced booking detection - look for confirmation patterns
  const bookingConfirmationPatterns = [
    /yes.*book/i,
    /please book/i,
    /book me/i,
    /schedule.*appointment/i,
    /confirm.*appointment/i,
    /book.*appointment/i,
    /reserve.*appointment/i,
    /book.*service/i,
    /schedule.*service/i,
    /book.*for/i,
    /schedule.*for/i,
    /appointment.*booked/i,
    /book.*tomorrow/i,
    /schedule.*tomorrow/i,
    /book.*today/i,
    /schedule.*today/i
  ];
  
  const isBookingRequest = bookingConfirmationPatterns.some(pattern => pattern.test(text));
  console.log('Is booking request:', isBookingRequest);
  
  // Enhanced date patterns including relative dates
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{1,2}-\d{1,2}-\d{4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(tomorrow)/i,
    /(today)/i,
    /(next week)/i,
    /(this week)/i
  ];
  
  let extractedDate = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedDate = match[1];
      console.log('Extracted date:', extractedDate);
      
      // Convert relative dates to actual dates
      if (extractedDate.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        extractedDate = tomorrow.toISOString().split('T')[0];
        console.log('Converted tomorrow to:', extractedDate);
      } else if (extractedDate.toLowerCase() === 'today') {
        const today = new Date();
        extractedDate = today.toISOString().split('T')[0];
        console.log('Converted today to:', extractedDate);
      }
      break;
    }
  }
  
  // Enhanced time patterns
  const timePatterns = [
    /(\d{1,2}:\d{2}\s*(am|pm))/i,
    /(\d{1,2}\s*(am|pm))/i,
    /(\d{1,2}:\d{2})/i,
    /(\d{1,2})/i
  ];
  
  let extractedTime = null;
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedTime = match[1];
      console.log('Extracted time:', extractedTime);
      break;
    }
  }
  
  // Enhanced service extraction
  const serviceKeywords = ['wash', 'detail', 'wax', 'interior', 'exterior', 'full', 'basic', 'cleaning', 'service'];
  const extractedServices = serviceKeywords.filter(keyword => text.includes(keyword));
  console.log('Extracted services:', extractedServices);
  
  const result = {
    isBookingRequest,
    extractedDate,
    extractedTime,
    extractedServices: extractedServices.length > 0 ? extractedServices : null
  };
  
  console.log('Booking info result:', result);
  console.log('=== END EXTRACTING BOOKING INFO ===');
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI SMS WEBHOOK START ===');
    
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const fromRaw = formData.get('From') as string;
    const toRaw = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const from = normalizeToE164(fromRaw) || fromRaw;
    const to = normalizeToE164(toRaw) || toRaw;
    
    console.log('Incoming AI SMS message:', {
      from,
      to,
      body,
      messageSid,
    });

    // Find the detailer by their Twilio phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: to,
        smsEnabled: true,
      },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        googleCalendarRefreshToken: true,
        syncAppointments: true,
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (!detailer) {
      console.error('No detailer found for Twilio number:', to);
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
          orderBy: { createdAt: 'asc' },
          take: 20 // Last 20 messages for context
        }
      }
    });

    if (!conversation) {
      // Create new conversation for incoming message
      conversation = await prisma.conversation.create({
        data: {
          detailerId: detailer.id,
          customerPhone: from,
          status: 'active',
          lastMessageAt: new Date(),
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20
          }
        }
      });

      // Create notification for new customer SMS
      try {
        await prisma.notification.create({
          data: {
            detailerId: detailer.id,
            message: `New SMS from ${from}`,
            type: 'sms',
            link: '/detailer-dashboard/messages',
          },
        });
        console.log('SMS notification created for new customer:', from);
      } catch (notificationError) {
        // Don't fail the conversation creation if notification creation fails
        console.error('Error creating SMS notification:', notificationError);
      }
    } else {
      // Update existing conversation
      conversation = await prisma.conversation.update({
        where: { id: conversation!.id },
        data: {
          status: 'active',
          lastMessageAt: new Date(),
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20
          }
        }
      });
    }

    // Ensure we have recent messages loaded for context
    conversation = await prisma.conversation.findUnique({
      where: { id: conversation!.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    }) as any;

    // Store the incoming message
    const incomingMessage = await prisma.message.create({
      data: {
        conversationId: conversation!.id,
        direction: 'inbound',
        content: body,
        twilioSid: messageSid,
        status: 'received',
      },
    });

    console.log('Message stored for conversation:', conversation!.id);
    console.log('Customer message:', body);
    console.log('Detailer:', detailer.businessName);

    // Merge snapshot hints from the latest inbound text
    const inferred = extractSnapshotHints(body || '')
    if (Object.keys(inferred).length > 0) {
      await upsertCustomerSnapshot(detailer.id, from, inferred)
    }

    // Also extract hints from the entire conversation history to catch names mentioned earlier
    const allMessages = conversation?.messages || []
    const fullConversationText = allMessages.map(m => m.content).join(' ')
    const historicalInferred = extractSnapshotHints(fullConversationText)
    if (Object.keys(historicalInferred).length > 0) {
      await upsertCustomerSnapshot(detailer.id, from, historicalInferred)
    }

    // Load snapshot and include as context
    const snapshot = await getCustomerSnapshot(detailer.id, from)

    // Get updated messages for AI processing
    const history = Array.isArray(conversation?.messages) ? conversation.messages : []
    const updatedMessages = [...history, incomingMessage];

    // Get AI response
    console.log('Generating AI response...');
    const aiResponse = await getAIResponse(updatedMessages, {
      ...detailer,
      snapshot,
    }, history);

    // Store the AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation!.id,
        direction: 'outbound',
        content: aiResponse,
        status: 'sending',
      },
    });

    // Send SMS response via Twilio (skip in dev if disabled or creds missing)
    let twilioSid: string | undefined
    const sendDisabled = process.env.TWILIO_SEND_DISABLED === '1'
    const hasTwilioCreds = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN
    if (!sendDisabled && hasTwilioCreds) {
      console.log('Sending AI response via Twilio...');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      try {
        const twilioMessage = await client.messages.create({
          to: from,
          from: to,
          body: aiResponse
        });
        twilioSid = twilioMessage.sid
        await prisma.message.update({
          where: { id: aiMessage.id },
          data: { twilioSid, status: 'sent' },
        });
      } catch (e) {
        console.error('Twilio send failed, storing as simulated. Error:', e)
        await prisma.message.update({
          where: { id: aiMessage.id },
          data: { status: 'simulated' },
        });
      }
    } else {
      console.log('Twilio send disabled or creds missing; marking message as simulated.')
      await prisma.message.update({
        where: { id: aiMessage.id },
        data: { status: 'simulated' },
      });
    }

    // Check if this is a booking update request first
    const updateInfo = detectBookingUpdate(updatedMessages);
    
    if (updateInfo.isUpdateRequest && conversation) {
      console.log('Processing booking update request:', updateInfo);
      
      try {
        // Find the most recent booking for this customer
        const existingBooking = await prisma.booking.findFirst({
          where: {
            detailerId: conversation.detailerId,
            customerPhone: from,
            status: { in: ['pending', 'confirmed'] }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (existingBooking) {
          console.log('Found existing booking to update:', existingBooking.id);
          
          let updateData: any = {};
          let updatedFields: string[] = [];
          
          // Update service
          if (updateInfo.changeType === 'service' && updateInfo.newService) {
            updateData.services = [updateInfo.newService];
            updatedFields.push(`service to ${updateInfo.newService}`);
          }
          
          // Update time
          if (updateInfo.changeType === 'time' && updateInfo.newTime) {
            updateData.scheduledTime = updateInfo.newTime;
            updatedFields.push(`time to ${updateInfo.newTime}`);
          }
          
          // Update date
          if (updateInfo.changeType === 'date' && updateInfo.newDate) {
            let newDate = updateInfo.newDate;
            
            // Convert relative dates
            if (newDate.toLowerCase() === 'tomorrow') {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              newDate = tomorrow.toISOString().split('T')[0];
            } else if (newDate.toLowerCase() === 'today') {
              const today = new Date();
              newDate = today.toISOString().split('T')[0];
            }
            
            updateData.scheduledDate = new Date(newDate);
            updatedFields.push(`date to ${newDate}`);
          }
          
          // Update customer name from snapshot if available
          const snap = await getCustomerSnapshot(detailer.id, from);
          if (snap?.customerName && snap.customerName !== existingBooking.customerName) {
            updateData.customerName = snap.customerName;
            updatedFields.push(`customer name to ${snap.customerName}`);
          }
          
          if (Object.keys(updateData).length > 0) {
            // Update the booking
            await prisma.booking.update({
              where: { id: existingBooking.id },
              data: {
                ...updateData,
                updatedAt: new Date()
              }
            });
            
            console.log('Booking updated successfully:', updatedFields);
            
            // Update the associated calendar event
            try {
              const calendarEvent = await prisma.event.findFirst({
                where: { bookingId: existingBooking.id }
              });
              
              if (calendarEvent) {
                const updatedEventData: any = {};
                
                if (updateData.services) {
                  const customerName = updateData.customerName || existingBooking.customerName || 'Customer';
                  updatedEventData.title = `${customerName} - ${updateData.services.join(', ')}`;
                  updatedEventData.description = `Customer: ${customerName}\nPhone: ${existingBooking.customerPhone}\nVehicle: ${existingBooking.vehicleType}\nLocation: ${existingBooking.vehicleLocation}\nServices: ${updateData.services.join(', ')}`;
                }
                
                if (updateData.scheduledDate) {
                  updatedEventData.date = updateData.scheduledDate;
                }
                
                if (updateData.scheduledTime) {
                  updatedEventData.time = updateData.scheduledTime;
                }
                
                if (Object.keys(updatedEventData).length > 0) {
                  await prisma.event.update({
                    where: { id: calendarEvent.id },
                    data: updatedEventData
                  });
                  
                  console.log('Calendar event updated successfully');
                  
                  // Sync to Google Calendar if connected
                  if (detailer.googleCalendarConnected && detailer.googleCalendarTokens && calendarEvent.googleEventId) {
                    try {
                      const { updateGoogleCalendarEvent } = await import('@/lib/calendarSync');
                      await updateGoogleCalendarEvent(calendarEvent.googleEventId, updatedEventData);
                      console.log('Google Calendar event updated successfully');
                    } catch (error) {
                      console.error('Error updating Google Calendar event:', error);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error updating calendar event:', error);
            }
            
            // Create notification for detailer about the update
            try {
              await prisma.notification.create({
                data: {
                  detailerId: detailer.id,
                  message: `Booking Updated: Customer changed ${updatedFields.join(', ')}`,
                  type: 'booking_updated',
                  link: '/detailer-dashboard/bookings',
                },
              });
              console.log('Notification created for booking update');
            } catch (notificationError) {
              console.error('Error creating update notification:', notificationError);
            }
          }
        } else {
          console.log('No existing booking found to update');
        }
      } catch (updateError) {
        console.error('Error updating booking:', updateError);
        // Don't fail the webhook if update fails
      }
    }
    
    // Check if this is a booking request and extract information
    const bookingInfo = extractBookingInfo(updatedMessages);
    
    if (bookingInfo.isBookingRequest && bookingInfo.extractedDate && conversation) {
      console.log('Creating booking with data:', {
        extractedDate: bookingInfo.extractedDate,
        extractedTime: bookingInfo.extractedTime,
        extractedServices: bookingInfo.extractedServices
      });
      
      let booking;
      try {
        // Check if booking already exists to avoid duplicates
        const existingBooking = await prisma.booking.findFirst({
          where: {
            detailerId: conversation.detailerId,
            customerPhone: from,
            scheduledDate: new Date(bookingInfo.extractedDate)
          }
        });

        if (existingBooking) {
          console.log('Booking already exists for this date and customer');
          booking = existingBooking;
        } else {
          // Create a pending booking (use snapshot fallbacks)
          const snap = snapshot || (await getCustomerSnapshot(detailer.id, from))
          booking = await prisma.booking.create({
            data: {
              detailerId: conversation.detailerId,
              conversationId: conversation.id,
              customerPhone: from,
              customerName: snap?.customerName,
              vehicleType: snap?.vehicle ?? [snap?.vehicleYear, snap?.vehicleMake, snap?.vehicleModel].filter(Boolean).join(' '),
              scheduledDate: new Date(bookingInfo.extractedDate),
              scheduledTime: bookingInfo.extractedTime,
              services: bookingInfo.extractedServices || [],
              status: 'pending',
              notes: `AI booking request from SMS conversation${snap?.address ? ` | Address: ${snap.address}` : ''}`
            }
          });
          console.log('Booking created:', booking.id);
        }

        // Create calendar event and sync to Google Calendar
        try {
          console.log('=== GOOGLE CALENDAR SYNC START ===');
          const { createCalendarEvent, syncToGoogleCalendar } = await import('@/lib/calendarSync');
          
          // Create local calendar event
          console.log('Creating local calendar event...');
          const calendarEvent = await createCalendarEvent(conversation.detailerId, booking);
          console.log('Calendar event created:', calendarEvent.id);
          
          // Sync to Google Calendar if connected
          if (detailer.googleCalendarConnected && detailer.googleCalendarTokens) {
            console.log('Syncing to Google Calendar...');
            const googleEventId = await syncToGoogleCalendar(conversation.detailerId, calendarEvent);
            if (googleEventId) {
              console.log('Google Calendar event synced:', googleEventId);
              
              // Update booking with Google Calendar event ID
              await prisma.booking.update({
                where: { id: booking.id },
                data: { googleEventId }
              });
              console.log('Booking updated with Google Calendar event ID');
            }
          }
          console.log('=== GOOGLE CALENDAR SYNC END ===');
        } catch (error) {
          console.error('Error syncing booking to Google Calendar:', error);
          // Don't fail the booking creation if Google Calendar sync fails
        }

      } catch (bookingError) {
        console.error('Error creating booking:', bookingError);
        throw bookingError;
      }
    }

    console.log('=== AI SMS WEBHOOK SUCCESS ===');
    console.log('AI Response:', aiResponse);
    if (twilioSid) console.log('Twilio Message SID:', twilioSid);

    return NextResponse.json({ 
      success: true,
      aiResponse,
      messageId: aiMessage.id,
      twilioSid: twilioSid,
      bookingCreated: bookingInfo.isBookingRequest,
      bookingUpdated: updateInfo.isUpdateRequest
    });

  } catch (error) {
    console.error('=== AI SMS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
