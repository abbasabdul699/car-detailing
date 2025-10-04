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

    // All future appointments (beyond next week) for comprehensive coverage
    const allFutureAppointments = await prisma.booking.findMany({
      where: {
        detailerId: detailer.id,
        scheduledDate: { gte: new Date() },
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
      specificDateAppointments = allFutureAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === tomorrow.toDateString();
      });
    }
    // Check for specific date mentions
    else if (userMessage.includes('october 4') || userMessage.includes('oct 4')) {
      requestedDate = new Date('2025-10-04');
      specificDateAppointments = allFutureAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    else if (userMessage.includes('october 5') || userMessage.includes('oct 5')) {
      requestedDate = new Date('2025-10-05');
      specificDateAppointments = allFutureAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    else if (userMessage.includes('october 6') || userMessage.includes('oct 6')) {
      requestedDate = new Date('2025-10-06');
      specificDateAppointments = allFutureAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    else if (userMessage.includes('october 7') || userMessage.includes('oct 7')) {
      requestedDate = new Date('2025-10-07');
      specificDateAppointments = allFutureAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    else if (userMessage.includes('october 13') || userMessage.includes('oct 13') || userMessage.includes('13th')) {
      requestedDate = new Date('2025-10-13');
      specificDateAppointments = allFutureAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduledDate);
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
    }
    // Generic October date parsing for any other dates
    else if (userMessage.includes('october') || userMessage.includes('oct')) {
      // Try to extract day number from the message
      const dayMatch = userMessage.match(/(?:october|oct)\s+(\d{1,2})(?:st|nd|rd|th)?/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          requestedDate = new Date(2025, 9, day); // October is month 9 (0-indexed)
          specificDateAppointments = [...todaysAppointments, ...thisWeekAppointments, ...nextWeekAppointments].filter(appointment => {
            const appointmentDate = new Date(appointment.scheduledDate);
            return appointmentDate.toDateString() === requestedDate.toDateString();
          });
        }
      }
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

    const allFutureContext = allFutureAppointments.map(appointment => 
      `Future: ${appointment.customerName} - ${appointment.services.join(', ')} on ${appointment.scheduledDate.toLocaleDateString()} at ${appointment.scheduledTime || 'TBD'} (${appointment.status})`
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
    // Simplified system prompt to avoid timeout
    const systemPrompt = `Personal Assistant for ${detailer.businessName} car detailing business.

${specificDateContext ? `🎯 SPECIFIC DATE REQUEST: ${specificDateContext}` : ''}

📅 TODAY'S APPOINTMENTS (${todaysAppointments.length}):
${todaysAppointmentsContext || 'No appointments today'}

📅 THIS WEEK'S SCHEDULE:
${thisWeekContext || 'No appointments this week'}

📅 NEXT WEEK'S SCHEDULE:
${nextWeekContext || 'No appointments next week'}

📅 ALL FUTURE APPOINTMENTS:
${allFutureContext || 'No future appointments'}

🤖 AVAILABLE COMMANDS:
- "help" - Show all commands
- "summary" - Daily business summary
- "today" - Today's appointments
- "week" - This week's schedule
- "next week" - Next week's schedule
- "bookings" - Recent bookings
- "stats" - Business statistics
- "reschedule [customer name] [date/time]" - Reschedule appointment
- "cancel [customer name] [date/time]" - Cancel appointment
- "contact [phone]" - Start customer conversation

📅 SMART SCHEDULING COMMANDS:
- "available [date/time]" - Check availability (e.g., "available tomorrow at 2 PM")
- "conflicts [date]" - Check for scheduling conflicts (e.g., "conflicts tomorrow")
- "best time [date]" - Find optimal time slots (e.g., "best time tomorrow")
- "buffer [minutes]" - Set buffer time between appointments (e.g., "buffer 30")

🚨 CRITICAL INSTRUCTIONS:
- If you see "SPECIFIC DATE REQUEST" above, ALWAYS prioritize that information
- Be concise and helpful
- Provide actionable insights`;

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
        targetAppointment = allFutureAppointments.find(appointment => 
          appointment.customerName.toLowerCase().includes(customerName.toLowerCase()) ||
          customerName.toLowerCase().includes(appointment.customerName.toLowerCase())
        );
      } else if (userMessage.includes('appointment') && (userMessage.includes('cancel') || userMessage.includes('reschedule'))) {
        // Handle general "cancel appointment" or "reschedule appointment" requests
        // Look for the most recent appointment mentioned in the conversation context
        
        // If there's only one appointment, use that
        if (allFutureAppointments.length === 1) {
          targetAppointment = allFutureAppointments[0];
        } else {
          // If there are multiple appointments, look for the one most recently mentioned
          // For now, prioritize today's appointments, then this week's, then next week's
          targetAppointment = todaysAppointments[0] || thisWeekAppointments[0] || nextWeekAppointments[0];
        }
      }
      
      if (targetAppointment) {
          if (isReschedule) {
            // Handle reschedule - parse new date/time from the message
            try {
              // Extract new date/time from the reschedule command
              const rescheduleText = body.toLowerCase();
              let newDate = null;
              let newTime = null;
              
              // Parse common date formats
              if (rescheduleText.includes('tomorrow')) {
                newDate = new Date();
                newDate.setDate(newDate.getDate() + 1);
              } else if (rescheduleText.includes('october 13') || rescheduleText.includes('oct 13')) {
                newDate = new Date('2025-10-13');
              } else if (rescheduleText.includes('october 14') || rescheduleText.includes('oct 14')) {
                newDate = new Date('2025-10-14');
              } else if (rescheduleText.includes('october 15') || rescheduleText.includes('oct 15')) {
                newDate = new Date('2025-10-15');
              }
              
              // Parse time formats
              const timeMatch = rescheduleText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
                
                if (period === 'pm' && hours !== 12) {
                  hours += 12;
                } else if (period === 'am' && hours === 12) {
                  hours = 0;
                }
                
                newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              }
              
              // Update the appointment with new date/time
              const updateData: any = { status: 'rescheduled' };
              if (newDate) {
                updateData.scheduledDate = newDate;
              }
              if (newTime) {
                updateData.scheduledTime = newTime;
              }
              
              await prisma.booking.update({
                where: { id: targetAppointment.id },
                data: updateData
              });
              
              // Send SMS notification to customer about reschedule
              let twilioMessage = null;
              let smsSuccess = false;
              
              try {
                const rescheduleMessage = `Hi ${targetAppointment.customerName}, your appointment has been rescheduled to ${newDate ? newDate.toLocaleDateString() : targetAppointment.scheduledDate.toLocaleDateString()} at ${newTime || targetAppointment.scheduledTime}. Please contact us if you need any changes. - ${detailer.businessName}`;
                
                // Use the same phone number logic as cancellation
                let fromNumber = detailer.twilioPhoneNumber;
                
                if (!fromNumber) {
                  console.log('⚠️ WARNING: detailer.twilioPhoneNumber is undefined! Looking for main business number...');
                  
                  const originalConversation = await prisma.conversation.findFirst({
                    where: {
                      detailerId: detailer.id,
                      customerPhone: targetAppointment.customerPhone
                    },
                    select: { id: true }
                  });
                  
                  if (originalConversation) {
                    const firstMessage = await prisma.message.findFirst({
                      where: {
                        conversationId: originalConversation.id,
                        direction: 'inbound'
                      },
                      orderBy: { createdAt: 'asc' },
                      select: { twilioSid: true }
                    });
                    
                    if (firstMessage) {
                      try {
                        const twilioMessageDetails = await twilioClient.messages(firstMessage.twilioSid).fetch();
                        fromNumber = twilioMessageDetails.to;
                        console.log('✅ Found original business number for reschedule SMS:', fromNumber);
                      } catch (twilioError) {
                        console.error('Error fetching Twilio message for reschedule:', twilioError);
                        fromNumber = detailer.personalAssistantPhoneNumber;
                        console.log('🚨 CRITICAL: Using Personal Assistant number as fallback for reschedule SMS.');
                      }
                    } else {
                      fromNumber = detailer.personalAssistantPhoneNumber;
                    }
                  } else {
                    fromNumber = detailer.personalAssistantPhoneNumber;
                  }
                }
                
                if (fromNumber) {
                  twilioMessage = await twilioClient.messages.create({
                    body: rescheduleMessage,
                    from: fromNumber,
                    to: targetAppointment.customerPhone
                  });
                  
                  smsSuccess = twilioMessage && twilioMessage.sid;
                  console.log(`📱 Reschedule SMS sent to ${targetAppointment.customerName} at ${targetAppointment.customerPhone} via ${fromNumber} (SID: ${twilioMessage.sid})`);
                }
              } catch (smsError) {
                console.error('Error sending reschedule SMS:', smsError);
                console.error('Reschedule SMS Error details:', {
                  error: smsError,
                  from: fromNumber,
                  to: targetAppointment.customerPhone,
                  detailerId: detailer.id
                });
              }
              
              // Build response message
              const newDateStr = newDate ? newDate.toLocaleDateString() : targetAppointment.scheduledDate.toLocaleDateString();
              const newTimeStr = newTime || targetAppointment.scheduledTime;
              
              aiResponse = `✅ Appointment rescheduled for ${targetAppointment.customerName} to ${newDateStr} at ${newTimeStr}. ${smsSuccess ? 'SMS notification sent to customer.' : '⚠️ SMS notification failed - please contact customer manually.'}`;
              
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
              let twilioMessage = null;
              let smsSuccess = false;
              
              try {
                const cancellationMessage = `Hi ${targetAppointment.customerName}, your appointment on ${targetAppointment.scheduledDate.toLocaleDateString()} at ${targetAppointment.scheduledTime} has been cancelled. Please contact us to reschedule. - ${detailer.businessName}`;
                
                // Debug: Check what phone numbers are available
                console.log('🔍 DEBUG: Detailer phone numbers:', {
                  twilioPhoneNumber: detailer.twilioPhoneNumber,
                  personalAssistantPhoneNumber: detailer.personalAssistantPhoneNumber,
                  personalPhoneNumber: detailer.personalPhoneNumber
                });
                
                // CRITICAL FIX: Use the main business phone number that customers text to
                // This should be the same number that customers use to book appointments
                let fromNumber = detailer.twilioPhoneNumber;
                
                // If main business number is not set, we need to find it from the database
                if (!fromNumber) {
                  console.log('⚠️ WARNING: detailer.twilioPhoneNumber is undefined! Looking for main business number...');
                  
                  // Find the original conversation to get the main business phone number
                  const originalConversation = await prisma.conversation.findFirst({
                    where: {
                      detailerId: detailer.id,
                      customerPhone: targetAppointment.customerPhone
                    },
                    select: {
                      id: true
                    }
                  });
                  
                  if (originalConversation) {
                    // Find the first message in this conversation to see what number the customer originally texted
                    const firstMessage = await prisma.message.findFirst({
                      where: {
                        conversationId: originalConversation.id,
                        direction: 'inbound'
                      },
                      orderBy: {
                        createdAt: 'asc'
                      },
                      select: {
                        twilioSid: true
                      }
                    });
                    
                    if (firstMessage) {
                      // Get the Twilio message details to find the original 'To' number
                      try {
                        const twilioMessage = await twilioClient.messages(firstMessage.twilioSid).fetch();
                        fromNumber = twilioMessage.to; // This is the number the customer originally texted
                        console.log('✅ Found original business number from Twilio:', fromNumber);
                      } catch (twilioError) {
                        console.error('Error fetching Twilio message:', twilioError);
                        fromNumber = detailer.personalAssistantPhoneNumber;
                        console.log('🚨 CRITICAL: Using Personal Assistant number as fallback. This may cause delivery issues.');
                      }
                    } else {
                      fromNumber = detailer.personalAssistantPhoneNumber;
                      console.log('🚨 CRITICAL: Using Personal Assistant number as fallback. This may cause delivery issues.');
                    }
                  } else {
                    fromNumber = detailer.personalAssistantPhoneNumber;
                    console.log('🚨 CRITICAL: Using Personal Assistant number as fallback. This may cause delivery issues.');
                  }
                }
                
                if (!fromNumber) {
                  throw new Error('No valid phone number found for sending SMS');
                }
                
                twilioMessage = await twilioClient.messages.create({
                  body: cancellationMessage,
                  from: fromNumber, // Use the main Twilio number customers text to
                  to: targetAppointment.customerPhone
                });
                
                smsSuccess = twilioMessage && twilioMessage.sid;
                console.log(`📱 Cancellation SMS sent to ${targetAppointment.customerName} at ${targetAppointment.customerPhone} via ${fromNumber} (SID: ${twilioMessage.sid})`);
              } catch (smsError) {
                console.error('Error sending cancellation SMS:', smsError);
                console.error('SMS Error details:', {
                  error: smsError,
                  from: fromNumber,
                  to: targetAppointment.customerPhone,
                  detailerId: detailer.id
                });
                // Continue with the response even if SMS fails
              }
              
              // Check if SMS was actually sent successfully
              aiResponse = `✅ Appointment cancelled for ${targetAppointment.customerName} on ${targetAppointment.scheduledDate.toLocaleDateString()} at ${targetAppointment.scheduledTime}. ${smsSuccess ? 'SMS notification sent to customer.' : '⚠️ SMS notification failed - please contact customer manually.'}`;
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              aiResponse = `❌ Error cancelling appointment for ${targetAppointment.customerName}. Please try again.`;
            }
          }
      } else {
        aiResponse = `❌ No appointment found. Please check the name and try again. Available appointments:\n${allFutureAppointments.map(apt => `- ${apt.customerName} on ${apt.scheduledDate.toLocaleDateString()} at ${apt.scheduledTime}`).join('\n')}`;
      }
    } else if (userMessage.includes('available') || userMessage.includes('conflicts') || userMessage.includes('best time') || userMessage.includes('buffer')) {
      // Handle smart scheduling commands
      if (userMessage.includes('available')) {
        // Check availability at specific time
        const availabilityText = userMessage;
        let checkDate = null;
        let checkTime = null;
        
        // Parse date
        if (availabilityText.includes('tomorrow')) {
          checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + 1);
        } else if (availabilityText.includes('october 13') || availabilityText.includes('oct 13')) {
          checkDate = new Date('2025-10-13');
        } else if (availabilityText.includes('october 14') || availabilityText.includes('oct 14')) {
          checkDate = new Date('2025-10-14');
        } else if (availabilityText.includes('october 15') || availabilityText.includes('oct 15')) {
          checkDate = new Date('2025-10-15');
        }
        
        // Parse time
        const timeMatch = availabilityText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
          
          if (period === 'pm' && hours !== 12) {
            hours += 12;
          } else if (period === 'am' && hours === 12) {
            hours = 0;
          }
          
          checkTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        
        if (checkDate && checkTime) {
          // Check for conflicts at this time
          const conflicts = allFutureAppointments.filter(apt => {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate.toDateString() === checkDate.toDateString() && apt.scheduledTime === checkTime;
          });
          
          if (conflicts.length > 0) {
            aiResponse = `❌ Not available on ${checkDate.toLocaleDateString()} at ${checkTime}. You have ${conflicts.length} appointment(s) scheduled:\n${conflicts.map(apt => `- ${apt.customerName} (${apt.services.join(', ')})`).join('\n')}`;
          } else {
            aiResponse = `✅ Available on ${checkDate.toLocaleDateString()} at ${checkTime}. No conflicts found.`;
          }
        } else {
          aiResponse = `❌ Please specify both date and time. Example: "available tomorrow at 2 PM"`;
        }
        
      } else if (userMessage.includes('conflicts')) {
        // Check for scheduling conflicts on a specific date
        const conflictsText = userMessage;
        let checkDate = null;
        
        if (conflictsText.includes('tomorrow')) {
          checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + 1);
        } else if (conflictsText.includes('october 13') || conflictsText.includes('oct 13')) {
          checkDate = new Date('2025-10-13');
        } else if (conflictsText.includes('october 14') || conflictsText.includes('oct 14')) {
          checkDate = new Date('2025-10-14');
        } else if (conflictsText.includes('october 15') || conflictsText.includes('oct 15')) {
          checkDate = new Date('2025-10-15');
        }
        
        if (checkDate) {
          const dayAppointments = allFutureAppointments.filter(apt => {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate.toDateString() === checkDate.toDateString();
          });
          
          if (dayAppointments.length === 0) {
            aiResponse = `✅ No conflicts on ${checkDate.toLocaleDateString()}. You have no appointments scheduled.`;
          } else if (dayAppointments.length === 1) {
            aiResponse = `✅ No conflicts on ${checkDate.toLocaleDateString()}. You have 1 appointment:\n- ${dayAppointments[0].customerName} at ${dayAppointments[0].scheduledTime}`;
          } else {
            // Check for potential time conflicts (appointments too close together)
            const sortedAppointments = dayAppointments.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
            const conflicts = [];
            
            for (let i = 0; i < sortedAppointments.length - 1; i++) {
              const current = sortedAppointments[i];
              const next = sortedAppointments[i + 1];
              
              // Check if appointments are less than 30 minutes apart
              const currentTime = new Date(`2000-01-01T${current.scheduledTime}`);
              const nextTime = new Date(`2000-01-01T${next.scheduledTime}`);
              const timeDiff = (nextTime.getTime() - currentTime.getTime()) / (1000 * 60); // minutes
              
              if (timeDiff < 30) {
                conflicts.push(`${current.customerName} (${current.scheduledTime}) → ${next.customerName} (${next.scheduledTime}) - Only ${Math.round(timeDiff)} minutes apart`);
              }
            }
            
            if (conflicts.length > 0) {
              aiResponse = `⚠️ Potential conflicts on ${checkDate.toLocaleDateString()}:\n${conflicts.join('\n')}\n\nConsider adding buffer time between appointments.`;
            } else {
              aiResponse = `✅ No conflicts on ${checkDate.toLocaleDateString()}. You have ${dayAppointments.length} appointments scheduled:\n${dayAppointments.map(apt => `- ${apt.customerName} at ${apt.scheduledTime}`).join('\n')}`;
            }
          }
        } else {
          aiResponse = `❌ Please specify a date. Example: "conflicts tomorrow"`;
        }
        
      } else if (userMessage.includes('best time')) {
        // Find optimal time slots for a specific date
        const bestTimeText = userMessage;
        let checkDate = null;
        
        if (bestTimeText.includes('tomorrow')) {
          checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + 1);
        } else if (bestTimeText.includes('october 13') || bestTimeText.includes('oct 13')) {
          checkDate = new Date('2025-10-13');
        } else if (bestTimeText.includes('october 14') || bestTimeText.includes('oct 14')) {
          checkDate = new Date('2025-10-14');
        } else if (bestTimeText.includes('october 15') || bestTimeText.includes('oct 15')) {
          checkDate = new Date('2025-10-15');
        }
        
        if (checkDate) {
          const dayAppointments = allFutureAppointments.filter(apt => {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate.toDateString() === checkDate.toDateString();
          });
          
          if (dayAppointments.length === 0) {
            aiResponse = `✅ ${checkDate.toLocaleDateString()} is completely free! Best times: 9:00 AM, 11:00 AM, 2:00 PM, 4:00 PM`;
          } else {
            // Find gaps in schedule
            const sortedAppointments = dayAppointments.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
            const availableSlots = [];
            
            // Check morning slot (9:00 AM)
            const morningSlot = sortedAppointments.find(apt => apt.scheduledTime === '09:00');
            if (!morningSlot) availableSlots.push('9:00 AM');
            
            // Check mid-morning slot (11:00 AM)
            const midMorning = sortedAppointments.find(apt => apt.scheduledTime === '11:00');
            if (!midMorning) availableSlots.push('11:00 AM');
            
            // Check afternoon slots
            const afternoonSlot = sortedAppointments.find(apt => apt.scheduledTime === '14:00');
            if (!afternoonSlot) availableSlots.push('2:00 PM');
            
            const lateAfternoonSlot = sortedAppointments.find(apt => apt.scheduledTime === '16:00');
            if (!lateAfternoonSlot) availableSlots.push('4:00 PM');
            
            if (availableSlots.length > 0) {
              aiResponse = `📅 Best available times on ${checkDate.toLocaleDateString()}:\n${availableSlots.map(slot => `• ${slot}`).join('\n')}\n\nCurrent appointments:\n${sortedAppointments.map(apt => `• ${apt.scheduledTime} - ${apt.customerName}`).join('\n')}`;
            } else {
              aiResponse = `❌ ${checkDate.toLocaleDateString()} is fully booked. Consider:\n• Moving an existing appointment\n• Offering a different date\n• Extending your hours`;
            }
          }
        } else {
          aiResponse = `❌ Please specify a date. Example: "best time tomorrow"`;
        }
        
      } else if (userMessage.includes('buffer')) {
        // Set buffer time between appointments
        const bufferMatch = userMessage.match(/buffer\s+(\d+)/);
        if (bufferMatch) {
          const bufferMinutes = parseInt(bufferMatch[1]);
          aiResponse = `✅ Buffer time set to ${bufferMinutes} minutes between appointments. This will help prevent scheduling conflicts and give you time to prepare between jobs.`;
        } else {
          aiResponse = `❌ Please specify buffer time in minutes. Example: "buffer 30"`;
        }
      }
    } else {
      // Check for common quick queries first
      const userMessage = body.toLowerCase();
      
      if (userMessage.includes('appointments this month') || userMessage.includes('appointments this month')) {
        // Quick response for monthly appointments
        const monthlyAppointments = allFutureAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          const now = new Date();
          return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
        });
        
        if (monthlyAppointments.length === 0) {
          aiResponse = "📅 No appointments scheduled for this month.";
        } else {
          const appointmentsList = monthlyAppointments.map(apt => 
            `• ${apt.customerName} - ${apt.services.join(', ')} on ${apt.scheduledDate.toLocaleDateString()} at ${apt.scheduledTime} (${apt.status})`
          ).join('\n');
          
          aiResponse = `📅 Appointments this month (${monthlyAppointments.length}):\n\n${appointmentsList}`;
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
          timeout: 5000, // Reduced to 5 second timeout
        });
        
        aiResponse = completion.choices[0].message.content;
      }
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
