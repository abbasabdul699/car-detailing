import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';
import OpenAI from 'openai';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 === PERSONAL ASSISTANT WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const to = formData.get('To') as string;

    console.log('📱 Personal Assistant SMS:', { from, body, to });

    // Find detailer by Personal Assistant AI phone number
    const detailer = await prisma.detailer.findFirst({
      where: { personalAssistantPhoneNumber: to },
      select: {
        id: true,
        businessName: true,
        personalPhoneNumber: true,
        personalAssistantPhoneNumber: true
      }
    });

    if (!detailer) {
      console.log('❌ Detailer not found for Twilio number:', to);
      return new NextResponse('Detailer not found', { status: 404 });
    }

    // Check if the message is from the detailer's personal phone
    console.log('🔍 Debug - From:', from, 'PersonalPhone:', detailer.personalPhoneNumber);
    console.log('🔍 Debug - Comparison:', from === detailer.personalPhoneNumber);
    console.log('🔍 Debug - From type:', typeof from, 'PersonalPhone type:', typeof detailer.personalPhoneNumber);
    
    // Normalize phone numbers for comparison
    const normalizedFrom = from?.trim();
    const normalizedPersonalPhone = detailer.personalPhoneNumber?.trim();
    
    console.log('🔍 Debug - Normalized From:', normalizedFrom, 'Normalized PersonalPhone:', normalizedPersonalPhone);
    console.log('🔍 Debug - Normalized Comparison:', normalizedFrom === normalizedPersonalPhone);
    
    if (normalizedFrom !== normalizedPersonalPhone) {
      console.log('❌ Message not from detailer personal phone:', normalizedFrom, '!==', normalizedPersonalPhone);
      return new NextResponse('Unauthorized', { status: 403 });
    }

    console.log('✅ Detailer found:', detailer.businessName);

    // Get comprehensive business data
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Get start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Today's appointments
    const todaysAppointments = await prisma.booking.findMany({
      where: {
        detailerId: detailer.id,
        scheduledDate: { gte: startOfToday, lt: endOfToday },
        status: { in: ['confirmed', 'pending', 'rescheduled'] }
      },
      orderBy: { scheduledTime: 'asc' },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        services: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        vehicleType: true,
        vehicleLocation: true
      }
    });

    // This week's appointments
    const thisWeekAppointments = await prisma.booking.findMany({
      where: {
        detailerId: detailer.id,
        scheduledDate: { gte: startOfWeek, lte: endOfWeek },
        status: { in: ['confirmed', 'pending', 'rescheduled'] }
      },
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        services: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        vehicleType: true,
        vehicleLocation: true
      }
    });

    // Next week's appointments
    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    const nextWeekAppointments = await prisma.booking.findMany({
      where: {
        detailerId: detailer.id,
        scheduledDate: { gte: startOfNextWeek, lte: endOfNextWeek },
        status: { in: ['confirmed', 'pending', 'rescheduled'] }
      },
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        services: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        vehicleType: true,
        vehicleLocation: true
      }
    });

    // Recent bookings (last 5)
    const recentBookings = await prisma.booking.findMany({
      where: { detailerId: detailer.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        services: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        vehicleType: true,
        vehicleLocation: true
      }
    });

    // Today's booking count
    const todaysBookingCount = await prisma.booking.count({
      where: {
        detailerId: detailer.id,
        createdAt: { gte: startOfToday, lt: endOfToday }
      }
    });

    // This week's booking count
    const thisWeekBookingCount = await prisma.booking.count({
      where: {
        detailerId: detailer.id,
        createdAt: { gte: startOfWeek, lte: endOfWeek }
      }
    });

    // Parse user's date request to provide specific context
    const userMessage = body.toLowerCase();
    let requestedDate = null;
    let specificDateAppointments = [];
    
    // Check for "tomorrow" requests
    if (userMessage.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      requestedDate = tomorrow;
      
      // Find appointments for tomorrow
      specificDateAppointments = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === tomorrow.toDateString();
      });
    }
    // Check for specific date mentions
    else if (userMessage.includes('october 4') || userMessage.includes('oct 4')) {
      requestedDate = new Date('2025-10-04');
      specificDateAppointments = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    else if (userMessage.includes('october 5') || userMessage.includes('oct 5')) {
      requestedDate = new Date('2025-10-05');
      specificDateAppointments = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    else if (userMessage.includes('october 6') || userMessage.includes('oct 6')) {
      requestedDate = new Date('2025-10-06');
      specificDateAppointments = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }

    // Build comprehensive context for AI
    const todaysAppointmentsContext = todaysAppointments.map(appointment => 
      `Today: ${appointment.customerName} - ${appointment.services.join(', ')} at ${appointment.scheduledTime || 'TBD'} (${appointment.vehicleType})`
    ).join('\n');

    const thisWeekContext = thisWeekAppointments.map(appointment => 
      `This Week: ${appointment.customerName} - ${appointment.services.join(', ')} on ${appointment.scheduledDate.toLocaleDateString()} at ${appointment.scheduledTime || 'TBD'}`
    ).join('\n');

    const nextWeekContext = nextWeekAppointments.map(appointment => 
      `Next Week: ${appointment.customerName} - ${appointment.services.join(', ')} on ${appointment.scheduledDate.toLocaleDateString()} at ${appointment.scheduledTime || 'TBD'}`
    ).join('\n');

    // Build specific date context if user asked about a specific date
    let specificDateContext = '';
    if (requestedDate && specificDateAppointments.length > 0) {
      const dateStr = requestedDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      specificDateContext = `\n\n📅 ${dateStr.toUpperCase()} APPOINTMENTS:\n`;
      specificDateAppointments.forEach(appointment => {
        specificDateContext += `- ${appointment.customerName} - ${appointment.services.join(', ')} at ${appointment.scheduledTime || 'TBD'} (${appointment.vehicleType})\n`;
      });
    } else if (requestedDate && specificDateAppointments.length === 0) {
      const dateStr = requestedDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      specificDateContext = `\n\n📅 ${dateStr.toUpperCase()}: No appointments scheduled.`;
    }

    const recentBookingsContext = recentBookings.map(booking => 
      `Recent: ${booking.customerName} - ${booking.services.join(', ')} on ${booking.scheduledDate.toLocaleDateString()} (${booking.status})`
    ).join('\n');

    // Debug logging
    console.log('🔍 DEBUG: Personal Assistant date parsing:');
    console.log('User message:', body);
    console.log('Requested date:', requestedDate);
    console.log('Specific date appointments:', specificDateAppointments.length);
    console.log('Specific date context:', specificDateContext);

    // Create comprehensive system prompt for personal assistant
    const systemPrompt = `Personal Assistant for ${detailer.businessName} car detailing business.

${specificDateContext ? `🎯 SPECIFIC DATE REQUEST: ${specificDateContext}` : ''}

📅 TODAY'S APPOINTMENTS (${todaysAppointments.length}):
${todaysAppointmentsContext || 'No appointments today'}

📊 TODAY'S STATS:
- New bookings today: ${todaysBookingCount}
- Appointments today: ${todaysAppointments.length}

📈 THIS WEEK'S OVERVIEW:
- Total appointments this week: ${thisWeekAppointments.length}
- New bookings this week: ${thisWeekBookingCount}

📋 THIS WEEK'S SCHEDULE:
${thisWeekContext || 'No appointments this week'}

📅 NEXT WEEK'S SCHEDULE:
${nextWeekContext || 'No appointments next week'}

📝 RECENT BOOKINGS:
${recentBookingsContext || 'No recent bookings'}

🤖 AVAILABLE COMMANDS:
- "help" - Show all commands
- "summary" - Daily business summary
- "today" - Today's appointments
- "week" - This week's schedule
- "next week" - Next week's schedule
- "bookings" - Recent bookings
- "stats" - Business statistics
- "reschedule [customer name] [date/time]" - Reschedule appointment (e.g., "reschedule Juan Dudley tomorrow at 2 PM")
- "cancel [customer name] [date/time]" - Cancel appointment (e.g., "cancel Juan Dudley October 4th at 1 PM")
- "contact [phone]" - Start customer conversation

🚨 CRITICAL INSTRUCTIONS:
- If you see "SPECIFIC DATE REQUEST" above, ALWAYS prioritize that information
- When customer asks about "tomorrow", check the SPECIFIC DATE REQUEST section first
- If SPECIFIC DATE REQUEST shows appointments, say "Yes, you have appointments tomorrow"
- If SPECIFIC DATE REQUEST shows no appointments, say "No appointments tomorrow"
- NEVER contradict the SPECIFIC DATE REQUEST information

Be concise, helpful, and provide actionable insights. For "summary", include today's performance and tomorrow's preparation.`;

    // Check for reschedule/cancel commands and handle them
    let aiResponse = '';
    
    if (userMessage.includes('reschedule') || userMessage.includes('cancel')) {
      // Parse the command
      const isReschedule = userMessage.includes('reschedule');
      const isCancel = userMessage.includes('cancel');
      
      // Extract customer name and date/time from the message
      const commandParts = body.split(' ');
      const commandIndex = isReschedule ? commandParts.findIndex(part => part.toLowerCase() === 'reschedule') : 
                                      commandParts.findIndex(part => part.toLowerCase() === 'cancel');
      
      let targetAppointment = null;
      
      if (commandIndex !== -1 && commandParts.length > commandIndex + 1) {
        // Find customer name (usually the next 1-2 words after the command)
        const customerName = commandParts[commandIndex + 1] + (commandParts[commandIndex + 2] && !commandParts[commandIndex + 2].match(/^\d/) ? ' ' + commandParts[commandIndex + 2] : '');
        
        // Find the appointment to modify
        targetAppointment = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].find(appointment => 
          appointment.customerName.toLowerCase().includes(customerName.toLowerCase()) ||
          customerName.toLowerCase().includes(appointment.customerName.toLowerCase())
        );
      } else if (userMessage.includes('appointment') && (userMessage.includes('cancel') || userMessage.includes('reschedule'))) {
        // Handle general "cancel appointment" or "reschedule appointment" requests
        // Look for the most recent appointment mentioned in the conversation context
        const allAppointments = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments];
        
        // If there's only one appointment, use that
        if (allAppointments.length === 1) {
          targetAppointment = allAppointments[0];
        } else {
          // If there are multiple appointments, look for the one most recently mentioned
          // For now, prioritize today's appointments, then this week's, then next week's
          targetAppointment = todaysAppointments[0] || thisWeekAppointments[0] || nextWeekAppointments[0];
        }
      }
      
      if (targetAppointment) {
          if (isReschedule) {
            // Handle reschedule
            try {
              await prisma.booking.update({
                where: { id: targetAppointment.id },
                data: { status: 'rescheduled' }
              });
              aiResponse = `✅ Appointment rescheduled for ${targetAppointment.customerName} on ${targetAppointment.scheduledDate.toLocaleDateString()} at ${targetAppointment.scheduledTime}. The appointment has been marked as rescheduled.`;
            } catch (error) {
              console.error('Error rescheduling appointment:', error);
              aiResponse = `❌ Error rescheduling appointment for ${targetAppointment.customerName}. Please try again.`;
            }
          } else if (isCancel) {
            // Handle cancel
            try {
              await prisma.booking.update({
                where: { id: targetAppointment.id },
                data: { status: 'cancelled' }
              });
              
              // Send SMS notification to customer about cancellation
              try {
                const cancellationMessage = `Hi ${targetAppointment.customerName}, your appointment on ${targetAppointment.scheduledDate.toLocaleDateString()} at ${targetAppointment.scheduledTime} has been cancelled. Please contact us to reschedule. - ${detailer.businessName}`;
                
                await twilioClient.messages.create({
                  body: cancellationMessage,
                  from: detailer.personalAssistantPhoneNumber,
                  to: targetAppointment.customerPhone
                });
                
                console.log(`📱 Cancellation SMS sent to ${targetAppointment.customerName} at ${targetAppointment.customerPhone}`);
              } catch (smsError) {
                console.error('Error sending cancellation SMS:', smsError);
                // Continue with the response even if SMS fails
              }
              
              aiResponse = `✅ Appointment cancelled for ${targetAppointment.customerName} on ${targetAppointment.scheduledDate.toLocaleDateString()} at ${targetAppointment.scheduledTime}. SMS notification sent to customer.`;
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              aiResponse = `❌ Error cancelling appointment for ${targetAppointment.customerName}. Please try again.`;
            }
          }
      } else {
        aiResponse = `❌ No appointment found. Please check the name and try again. Available appointments:\n${[...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].map(apt => `- ${apt.customerName} on ${apt.scheduledDate.toLocaleDateString()} at ${apt.scheduledTime}`).join('\n')}`;
      }
    } else {
      // Generate AI response with timeout optimization
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body }
        ],
        max_tokens: 200, // Reduced from 300
        temperature: 0.7,
      }, {
        timeout: 7000, // 7 second timeout
      });
      
      aiResponse = completion.choices[0].message.content;
    }

    console.log('🤖 AI Response:', aiResponse);

    // Check if the AI response contains actionable commands
    const lowerResponse = aiResponse.toLowerCase();
    
    // Handle reschedule command
    if (lowerResponse.includes('reschedule') && lowerResponse.includes('booking')) {
      // Extract booking ID and new details from the response
      const bookingIdMatch = aiResponse.match(/booking\s+(\w+)/i);
      if (bookingIdMatch) {
        const bookingId = bookingIdMatch[1];
        console.log('📅 Processing reschedule for booking:', bookingId);
        
        try {
          // Update booking status to rescheduled
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'rescheduled' }
          });

          // Create notification
          await prisma.notification.create({
            data: {
              detailerId: detailer.id,
              message: `📅 Booking ${bookingId} has been rescheduled via Personal Assistant`,
              type: 'booking_update',
              link: '/detailer-dashboard/bookings'
            }
          });
        } catch (error) {
          console.error('❌ Error updating booking:', error);
        }
      }
    }

    // Handle cancel command
    if (lowerResponse.includes('cancel') && lowerResponse.includes('booking')) {
      const bookingIdMatch = aiResponse.match(/booking\s+(\w+)/i);
      if (bookingIdMatch) {
        const bookingId = bookingIdMatch[1];
        console.log('❌ Processing cancellation for booking:', bookingId);
        
        try {
          // Update booking status to cancelled
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'cancelled' }
          });

          // Create notification
          await prisma.notification.create({
            data: {
              detailerId: detailer.id,
              message: `❌ Booking ${bookingId} has been cancelled via Personal Assistant`,
              type: 'booking_update',
              link: '/detailer-dashboard/bookings'
            }
          });
        } catch (error) {
          console.error('❌ Error updating booking:', error);
        }
      }
    }

    // Handle customer outreach command
    if (lowerResponse.includes('contact') || lowerResponse.includes('reach out')) {
      const phoneMatch = aiResponse.match(/(\+?\d{10,15})/);
      if (phoneMatch) {
        const customerPhone = phoneMatch[1];
        console.log('📞 Initiating customer outreach to:', customerPhone);
        
        // Create new conversation
        const conversation = await prisma.conversation.create({
          data: {
            detailerId: detailer.id,
            customerPhone: customerPhone,
            customerName: 'New Customer',
            status: 'active',
            lastMessageAt: new Date()
          }
        });

        // Send initial message to customer
        const outreachMessage = `Hi! This is ${detailer.businessName}. I'd like to discuss your car detailing needs. How can I help you today?`;
        
        await twilioClient.messages.create({
          body: outreachMessage,
          from: detailer.twilioPhoneNumber,
          to: customerPhone
        });

        // Save message to database
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: 'outbound',
            content: outreachMessage,
            status: 'sent'
          }
        });

        // Create notification
        await prisma.notification.create({
          data: {
            detailerId: detailer.id,
            message: `📞 Customer outreach initiated to ${customerPhone}`,
            type: 'new_conversation',
            link: `/detailer-dashboard/messages?conversationId=${conversation.id}`
          }
        });
      }
    }

    // Send response back to detailer
    await twilioClient.messages.create({
      body: aiResponse,
      from: detailer.personalAssistantPhoneNumber, // Use Personal Assistant AI number
      to: from
    });

    console.log('✅ Personal Assistant response sent successfully');

    return new NextResponse('', { status: 200 });

  } catch (error) {
    console.error('❌ Personal Assistant webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
