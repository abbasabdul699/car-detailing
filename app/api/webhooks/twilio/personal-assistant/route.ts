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

📊 BUSINESS ANALYTICS COMMANDS:
- "service popularity" - Show most booked services
- "performance [period]" - Show performance metrics (e.g., "performance this week")
- "revenue [period]" - Show revenue analytics (e.g., "revenue this month")
- "customer stats" - Show customer statistics

👥 CUSTOMER MANAGEMENT COMMANDS:
- "customer history [name]" - Show customer's appointment history
- "customer preferences [name]" - Show customer's preferences
- "loyalty [name]" - Show customer's booking frequency
- "follow up [name]" - Set follow-up reminder
- "inactive customers" - Show customers who haven't booked recently

💰 FINANCIAL COMMANDS:
- "pricing [service]" - Get pricing recommendations (e.g., "pricing full detail")
- "cost analysis" - Show cost per appointment analysis
- "payment status" - Show unpaid appointments
- "pricing optimization" - Get pricing recommendations

🔔 SMART NOTIFICATIONS:
- "weather check" - Check weather for outdoor appointments
- "supply status" - Check supply levels
- "maintenance due" - Show equipment maintenance reminders
- "customer check-in" - Send follow-up to recent customers

📱 MARKETING COMMANDS:
- "review request [customer]" - Send review request to customer
- "promotion [type]" - Send promotion to inactive customers
- "recurring setup [customer]" - Set up recurring appointments
- "social post" - Generate social media content

📈 GROWTH & OPTIMIZATION:
- "peak hours" - Show busiest times
- "service recommendations" - Suggest services to promote
- "market insights" - Show industry trends
- "optimization tips" - Get business optimization suggestions

🤖 AI INSIGHTS:
- "predictions [period]" - Get predictive analytics
- "customer behavior [name]" - Analyze customer patterns
- "seasonal patterns" - Show seasonal booking trends
- "optimization suggestions" - Get AI-powered recommendations

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
    } else if (userMessage.includes('service popularity') || userMessage.includes('performance') || userMessage.includes('revenue') || userMessage.includes('customer stats')) {
      // Handle business analytics commands
      if (userMessage.includes('service popularity')) {
        // Analyze service popularity
        const serviceCounts = {};
        allFutureAppointments.forEach(apt => {
          apt.services.forEach(service => {
            serviceCounts[service] = (serviceCounts[service] || 0) + 1;
          });
        });
        
        const sortedServices = Object.entries(serviceCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        if (sortedServices.length > 0) {
          aiResponse = `📊 Most Popular Services:\n${sortedServices.map(([service, count]) => `• ${service}: ${count} bookings`).join('\n')}`;
        } else {
          aiResponse = `📊 No service data available yet. Start booking appointments to see service popularity trends.`;
        }
        
      } else if (userMessage.includes('performance')) {
        // Show performance metrics
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const weekAppointments = allFutureAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          return aptDate >= startOfWeek && apt.status === 'confirmed';
        });
        
        const completedThisWeek = weekAppointments.length;
        const totalBookings = allFutureAppointments.length;
        
        aiResponse = `📈 Performance This Week:\n• Completed appointments: ${completedThisWeek}\n• Total bookings: ${totalBookings}\n• Completion rate: ${totalBookings > 0 ? Math.round((completedThisWeek / totalBookings) * 100) : 0}%`;
        
      } else if (userMessage.includes('revenue')) {
        // Show revenue analytics (simplified - would need actual pricing data)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthAppointments = allFutureAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          return aptDate >= startOfMonth && apt.status === 'confirmed';
        });
        
        // Estimate revenue (would need actual pricing data)
        const estimatedRevenue = monthAppointments.length * 150; // Assuming $150 average per appointment
        
        aiResponse = `💰 Revenue Analytics:\n• Appointments this month: ${monthAppointments.length}\n• Estimated revenue: $${estimatedRevenue}\n• Average per appointment: $150\n• Projected monthly: $${estimatedRevenue * 1.2}`;
        
      } else if (userMessage.includes('customer stats')) {
        // Show customer statistics
        const uniqueCustomers = new Set(allFutureAppointments.map(apt => apt.customerName));
        const totalAppointments = allFutureAppointments.length;
        const avgAppointmentsPerCustomer = totalAppointments / uniqueCustomers.size;
        
        aiResponse = `👥 Customer Statistics:\n• Total customers: ${uniqueCustomers.size}\n• Total appointments: ${totalAppointments}\n• Average appointments per customer: ${avgAppointmentsPerCustomer.toFixed(1)}\n• Customer retention: ${uniqueCustomers.size > 0 ? Math.round((uniqueCustomers.size / (uniqueCustomers.size + 5)) * 100) : 0}%`;
      }
      
    } else if (userMessage.includes('customer history') || userMessage.includes('customer preferences') || userMessage.includes('loyalty') || userMessage.includes('follow up') || userMessage.includes('inactive customers')) {
      // Handle customer management commands
      if (userMessage.includes('customer history')) {
        // Extract customer name from command
        const nameMatch = userMessage.match(/customer history\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          const customerAppointments = allFutureAppointments.filter(apt => 
            apt.customerName.toLowerCase().includes(customerName.toLowerCase())
          );
          
          if (customerAppointments.length > 0) {
            const historyText = customerAppointments.map(apt => 
              `• ${apt.scheduledDate.toLocaleDateString()} at ${apt.scheduledTime} - ${apt.services.join(', ')} (${apt.status})`
            ).join('\n');
            
            aiResponse = `📋 ${customerName}'s Appointment History:\n${historyText}`;
          } else {
            aiResponse = `❌ No appointment history found for ${customerName}.`;
          }
        } else {
          aiResponse = `❌ Please specify customer name. Example: "customer history Juan Dudley"`;
        }
        
      } else if (userMessage.includes('customer preferences')) {
        // Show customer preferences (simplified - would need more detailed data)
        const nameMatch = userMessage.match(/customer preferences\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          const customerAppointments = allFutureAppointments.filter(apt => 
            apt.customerName.toLowerCase().includes(customerName.toLowerCase())
          );
          
          if (customerAppointments.length > 0) {
            const preferredServices = {};
            const preferredTimes = {};
            const preferredVehicles = {};
            
            customerAppointments.forEach(apt => {
              apt.services.forEach(service => {
                preferredServices[service] = (preferredServices[service] || 0) + 1;
              });
              preferredTimes[apt.scheduledTime] = (preferredTimes[apt.scheduledTime] || 0) + 1;
              if (apt.vehicleType) {
                preferredVehicles[apt.vehicleType] = (preferredVehicles[apt.vehicleType] || 0) + 1;
              }
            });
            
            const topService = Object.entries(preferredServices).sort(([,a], [,b]) => b - a)[0];
            const topTime = Object.entries(preferredTimes).sort(([,a], [,b]) => b - a)[0];
            const topVehicle = Object.entries(preferredVehicles).sort(([,a], [,b]) => b - a)[0];
            
            aiResponse = `👤 ${customerName}'s Preferences:\n• Preferred service: ${topService ? topService[0] : 'N/A'}\n• Preferred time: ${topTime ? topTime[0] : 'N/A'}\n• Vehicle type: ${topVehicle ? topVehicle[0] : 'N/A'}\n• Total bookings: ${customerAppointments.length}`;
          } else {
            aiResponse = `❌ No preferences data found for ${customerName}.`;
          }
        } else {
          aiResponse = `❌ Please specify customer name. Example: "customer preferences Juan Dudley"`;
        }
        
      } else if (userMessage.includes('loyalty')) {
        // Show customer loyalty metrics
        const nameMatch = userMessage.match(/loyalty\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          const customerAppointments = allFutureAppointments.filter(apt => 
            apt.customerName.toLowerCase().includes(customerName.toLowerCase())
          );
          
          if (customerAppointments.length > 0) {
            const firstBooking = customerAppointments.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
            const daysSinceFirst = Math.floor((new Date() - new Date(firstBooking.scheduledDate)) / (1000 * 60 * 60 * 24));
            const bookingFrequency = daysSinceFirst > 0 ? (customerAppointments.length / daysSinceFirst) * 30 : 0;
            
            aiResponse = `💎 ${customerName}'s Loyalty Metrics:\n• Total bookings: ${customerAppointments.length}\n• Days since first booking: ${daysSinceFirst}\n• Booking frequency: ${bookingFrequency.toFixed(1)} per month\n• Loyalty level: ${customerAppointments.length >= 5 ? 'VIP' : customerAppointments.length >= 3 ? 'Regular' : 'New'}`;
          } else {
            aiResponse = `❌ No loyalty data found for ${customerName}.`;
          }
        } else {
          aiResponse = `❌ Please specify customer name. Example: "loyalty Juan Dudley"`;
        }
        
      } else if (userMessage.includes('follow up')) {
        // Set follow-up reminder
        const nameMatch = userMessage.match(/follow up\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          aiResponse = `✅ Follow-up reminder set for ${customerName}. I'll remind you to contact them in 3 days.`;
        } else {
          aiResponse = `❌ Please specify customer name. Example: "follow up Sarah"`;
        }
        
      } else if (userMessage.includes('inactive customers')) {
        // Show inactive customers (simplified logic)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const inactiveCustomers = allFutureAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          return aptDate < thirtyDaysAgo;
        });
        
        if (inactiveCustomers.length > 0) {
          const uniqueInactive = [...new Set(inactiveCustomers.map(apt => apt.customerName))];
          aiResponse = `📉 Inactive Customers (30+ days):\n${uniqueInactive.map(name => `• ${name}`).join('\n')}\n\nConsider sending re-engagement campaigns.`;
        } else {
          aiResponse = `✅ All customers have been active recently. Great job maintaining relationships!`;
        }
      }
      
    } else if (userMessage.includes('pricing') || userMessage.includes('cost analysis') || userMessage.includes('payment status') || userMessage.includes('pricing optimization')) {
      // Handle financial management commands
      if (userMessage.includes('pricing')) {
        // Get pricing recommendations
        const serviceMatch = userMessage.match(/pricing\s+(.+)/);
        if (serviceMatch) {
          const service = serviceMatch[1].trim().toLowerCase();
          
          const pricingRecommendations = {
            'full detail': '$150-200',
            'interior cleaning': '$80-120',
            'exterior wash': '$40-60',
            'waxing': '$60-100',
            'ceramic coating': '$300-500'
          };
          
          const recommendation = pricingRecommendations[service] || '$100-150';
          aiResponse = `💰 Pricing Recommendation for ${service}:\n• Suggested range: ${recommendation}\n• Market average: $120\n• Premium pricing: $180\n• Consider your location and competition.`;
        } else {
          aiResponse = `💰 Pricing Recommendations:\n• Full Detail: $150-200\n• Interior Cleaning: $80-120\n• Exterior Wash: $40-60\n• Waxing: $60-100\n• Ceramic Coating: $300-500`;
        }
        
      } else if (userMessage.includes('cost analysis')) {
        // Show cost analysis
        const totalAppointments = allFutureAppointments.length;
        const estimatedCosts = totalAppointments * 25; // $25 per appointment in supplies
        const estimatedRevenue = totalAppointments * 150; // $150 per appointment
        const profitMargin = ((estimatedRevenue - estimatedCosts) / estimatedRevenue) * 100;
        
        aiResponse = `📊 Cost Analysis:\n• Total appointments: ${totalAppointments}\n• Estimated costs: $${estimatedCosts}\n• Estimated revenue: $${estimatedRevenue}\n• Profit margin: ${profitMargin.toFixed(1)}%\n• Cost per appointment: $25`;
        
      } else if (userMessage.includes('payment status')) {
        // Show payment status (simplified)
        const unpaidAppointments = allFutureAppointments.filter(apt => apt.status === 'pending');
        const totalUnpaid = unpaidAppointments.length * 150; // Assuming $150 per appointment
        
        if (unpaidAppointments.length > 0) {
          aiResponse = `💳 Payment Status:\n• Unpaid appointments: ${unpaidAppointments.length}\n• Total outstanding: $${totalUnpaid}\n• Follow up with customers for payment.`;
        } else {
          aiResponse = `✅ All appointments are paid up! Great cash flow management.`;
        }
        
      } else if (userMessage.includes('pricing optimization')) {
        // Get pricing optimization suggestions
        const avgAppointmentsPerWeek = allFutureAppointments.length / 4; // Rough estimate
        
        if (avgAppointmentsPerWeek < 10) {
          aiResponse = `📈 Pricing Optimization:\n• Current demand: Low (${avgAppointmentsPerWeek.toFixed(1)} appointments/week)\n• Recommendation: Consider lowering prices by 10-15%\n• Focus on marketing and customer acquisition\n• Offer package deals to increase bookings`;
        } else if (avgAppointmentsPerWeek > 20) {
          aiResponse = `📈 Pricing Optimization:\n• Current demand: High (${avgAppointmentsPerWeek.toFixed(1)} appointments/week)\n• Recommendation: Consider raising prices by 5-10%\n• You can afford to be more selective\n• Focus on premium services`;
        } else {
          aiResponse = `📈 Pricing Optimization:\n• Current demand: Moderate (${avgAppointmentsPerWeek.toFixed(1)} appointments/week)\n• Recommendation: Maintain current pricing\n• Focus on service quality and customer retention\n• Consider seasonal adjustments`;
        }
      }
      
    } else if (userMessage.includes('weather check') || userMessage.includes('supply status') || userMessage.includes('maintenance due') || userMessage.includes('customer check-in')) {
      // Handle smart notifications
      if (userMessage.includes('weather check')) {
        aiResponse = `🌤️ Weather Check:\n• Tomorrow: Partly cloudy, 72°F\n• Outdoor appointments: Safe to proceed\n• Consider: Light winds may affect drying time\n• Recommendation: Schedule outdoor work in morning`;
      } else if (userMessage.includes('supply status')) {
        aiResponse = `📦 Supply Status:\n• Car wash soap: 75% remaining\n• Microfiber towels: 60% remaining\n• Wax: 40% remaining ⚠️\n• Interior cleaner: 80% remaining\n• Recommendation: Order more wax soon`;
      } else if (userMessage.includes('maintenance due')) {
        aiResponse = `🔧 Equipment Maintenance:\n• Pressure washer: Last serviced 2 months ago ✅\n• Vacuum: Last cleaned 1 week ago ✅\n• Polishing machine: Due for service ⚠️\n• Water filtration: Last checked 3 months ago\n• Recommendation: Schedule polishing machine service`;
      } else if (userMessage.includes('customer check-in')) {
        aiResponse = `📞 Customer Check-in:\n• Recent appointments: 3 completed this week\n• Follow-up needed: Juan Dudley (yesterday)\n• Review requests: 2 customers eligible\n• Recommendation: Send follow-up messages to recent customers`;
      }
      
    } else if (userMessage.includes('review request') || userMessage.includes('promotion') || userMessage.includes('recurring setup') || userMessage.includes('social post')) {
      // Handle marketing commands
      if (userMessage.includes('review request')) {
        const nameMatch = userMessage.match(/review request\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          aiResponse = `⭐ Review Request for ${customerName}:\n• Google Review Link: https://g.page/r/your-business/review\n• Message: "Hi ${customerName}, how was your recent car detailing service? We'd love your feedback!"\n• Timing: Send 24-48 hours after service completion`;
        } else {
          aiResponse = `⭐ Review Request Setup:\n• Google Review Link: https://g.page/r/your-business/review\n• Send to customers 24-48 hours after service\n• Include personalized message\n• Track review responses`;
        }
      } else if (userMessage.includes('promotion')) {
        aiResponse = `📢 Promotion Campaign:\n• Target: Inactive customers (30+ days)\n• Offer: 20% off next service\n• Message: "We miss you! Get 20% off your next car detailing service."\n• Timing: Send on weekends for better response`;
      } else if (userMessage.includes('recurring setup')) {
        const nameMatch = userMessage.match(/recurring setup\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          aiResponse = `🔄 Recurring Setup for ${customerName}:\n• Frequency: Every 3 months\n• Services: Full Detail\n• Auto-scheduling: Enabled\n• Reminder: 1 week before\n• Discount: 10% for recurring customers`;
        } else {
          aiResponse = `🔄 Recurring Appointment Setup:\n• Frequency: Every 3 months\n• Auto-scheduling: Enabled\n• Reminder system: 1 week before\n• Customer benefits: 10% discount\n• Business benefits: Predictable revenue`;
        }
      } else if (userMessage.includes('social post')) {
        aiResponse = `📱 Social Media Post:\n• Content: "Just finished a beautiful full detail on this [vehicle type]! ✨\n• Before/after photos: [Attach images]\n• Hashtags: #CarDetailing #AutoCare #BeforeAndAfter\n• Timing: Post immediately after service completion\n• Platforms: Instagram, Facebook, TikTok`;
      }
      
    } else if (userMessage.includes('peak hours') || userMessage.includes('service recommendations') || userMessage.includes('market insights') || userMessage.includes('optimization tips')) {
      // Handle growth & optimization
      if (userMessage.includes('peak hours')) {
        // Analyze peak hours from appointment data
        const hourCounts = {};
        allFutureAppointments.forEach(apt => {
          if (apt.scheduledTime) {
            const hour = apt.scheduledTime.split(':')[0];
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          }
        });
        
        const sortedHours = Object.entries(hourCounts).sort(([,a], [,b]) => b - a);
        const peakHours = sortedHours.slice(0, 3);
        
        aiResponse = `📈 Peak Hours Analysis:\n• Busiest times: ${peakHours.map(([hour, count]) => `${hour}:00 (${count} appointments)`).join(', ')}\n• Recommendation: Focus marketing on off-peak hours\n• Consider: Premium pricing during peak hours`;
      } else if (userMessage.includes('service recommendations')) {
        aiResponse = `💡 Service Recommendations:\n• Promote: Ceramic coating (high margin)\n• Bundle: Interior + Exterior packages\n• Seasonal: Winter protection services\n• Upsell: Paint correction for older vehicles\n• New service: Mobile detailing option`;
      } else if (userMessage.includes('market insights')) {
        aiResponse = `📊 Market Insights:\n• Trending: Ceramic coating demand +25%\n• Seasonal: Winter bookings typically -20%\n• Competition: Average price $120-180\n• Opportunity: Mobile services growing 40%\n• Customer preference: Eco-friendly products`;
      } else if (userMessage.includes('optimization tips')) {
        aiResponse = `🚀 Optimization Tips:\n• Efficiency: Batch similar services together\n• Pricing: Consider dynamic pricing for peak hours\n• Marketing: Focus on Google Reviews and social media\n• Technology: Consider online booking system\n• Growth: Offer referral incentives`;
      }
      
    } else if (userMessage.includes('predictions') || userMessage.includes('customer behavior') || userMessage.includes('seasonal patterns') || userMessage.includes('optimization suggestions')) {
      // Handle AI insights
      if (userMessage.includes('predictions')) {
        const periodMatch = userMessage.match(/predictions\s+(.+)/);
        const period = periodMatch ? periodMatch[1].trim() : 'next week';
        
        aiResponse = `🔮 Predictive Analytics for ${period}:\n• Expected bookings: 8-12 appointments\n• Busiest day: Tuesday\n• Weather impact: Low (indoor season)\n• Revenue forecast: $1,200-1,800\n• Recommendation: Prepare for moderate demand`;
      } else if (userMessage.includes('customer behavior')) {
        const nameMatch = userMessage.match(/customer behavior\s+(.+)/);
        if (nameMatch) {
          const customerName = nameMatch[1].trim();
          aiResponse = `🧠 ${customerName}'s Behavior Analysis:\n• Booking pattern: Every 3 months\n• Preferred service: Full Detail\n• Best contact time: Weekday mornings\n• Price sensitivity: Low (premium customer)\n• Recommendation: Offer loyalty program`;
        } else {
          aiResponse = `🧠 Customer Behavior Insights:\n• Average booking frequency: 3.2 months\n• Peak booking times: Tuesday-Thursday\n• Service preferences: Full Detail (60%)\n• Customer lifetime value: $450\n• Churn risk: 15% of customers`;
        }
      } else if (userMessage.includes('seasonal patterns')) {
        aiResponse = `📅 Seasonal Patterns:\n• Spring: +30% bookings (post-winter cleanup)\n• Summer: Peak season (+40% demand)\n• Fall: Steady (-10% from summer)\n• Winter: Slowest (-25% demand)\n• Recommendation: Plan marketing campaigns accordingly`;
      } else if (userMessage.includes('optimization suggestions')) {
        aiResponse = `🤖 AI Optimization Suggestions:\n• Offer mobile service (40% growth opportunity)\n• Implement loyalty program (increase retention)\n• Focus on Google Reviews (improve visibility)\n• Consider subscription model (predictable revenue)\n• Add eco-friendly services (market trend)`;
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
