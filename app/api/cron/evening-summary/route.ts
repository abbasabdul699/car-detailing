import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function GET(request: NextRequest) {
  try {
    console.log('🌙 === EVENING SUMMARY CRON START ===');
    
    // Get all detailers with Personal Assistant AI enabled
    const detailers = await prisma.detailer.findMany({
      where: {
        personalAssistantPhoneNumber: { not: null },
        personalPhoneNumber: { not: null }
      },
      select: {
        id: true,
        businessName: true,
        personalPhoneNumber: true,
        personalAssistantPhoneNumber: true
      }
    });

    console.log(`📱 Found ${detailers.length} detailers with Personal Assistant AI`);

    for (const detailer of detailers) {
      try {
        // Get today's data
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        // Get start of week (Monday)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Today's completed appointments
        const todaysCompleted = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            scheduledDate: { gte: startOfToday, lt: endOfToday },
            status: 'completed'
          }
        });

        // Today's new bookings
        const todaysNewBookings = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            createdAt: { gte: startOfToday, lt: endOfToday }
          }
        });

        // This week's total bookings
        const thisWeekBookings = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            createdAt: { gte: startOfWeek }
          }
        });

        // Tomorrow's appointments
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

        const tomorrowsAppointments = await prisma.booking.findMany({
          where: {
            detailerId: detailer.id,
            scheduledDate: { gte: startOfTomorrow, lt: endOfTomorrow },
            status: { in: ['confirmed', 'pending'] }
          },
          orderBy: { scheduledTime: 'asc' },
          select: {
            customerName: true,
            services: true,
            scheduledTime: true
          }
        });

        // Build evening summary message
        let message = `🌙 Evening summary for ${detailer.businessName}:\n\n`;
        
        // Today's performance
        message += `📊 TODAY'S PERFORMANCE:\n`;
        message += `• Completed appointments: ${todaysCompleted}\n`;
        message += `• New bookings received: ${todaysNewBookings}\n\n`;

        // This week's progress
        message += `📈 THIS WEEK'S PROGRESS:\n`;
        message += `• Total bookings this week: ${thisWeekBookings}\n\n`;

        // Tomorrow's preparation
        if (tomorrowsAppointments.length > 0) {
          message += `🔮 TOMORROW'S SCHEDULE (${tomorrowsAppointments.length} appointments):\n`;
          tomorrowsAppointments.forEach(appointment => {
            message += `• ${appointment.customerName} - ${appointment.services.join(', ')} at ${appointment.scheduledTime || 'TBD'}\n`;
          });
          message += '\n';
        } else {
          message += `🔮 No appointments scheduled for tomorrow\n\n`;
        }

        // Add motivational closing
        message += `💪 Great work today! Rest well and prepare for tomorrow. Reply "help" for more commands.`;

        // Send evening summary to detailer's personal phone
        await twilioClient.messages.create({
          body: message,
          from: detailer.personalAssistantPhoneNumber!,
          to: detailer.personalPhoneNumber!
        });

        console.log(`✅ Evening summary sent to ${detailer.businessName}`);

      } catch (error) {
        console.error(`❌ Error sending evening summary to ${detailer.businessName}:`, error);
      }
    }

    console.log('✅ Evening summaries completed');
    return new NextResponse('Evening summaries sent', { status: 200 });

  } catch (error) {
    console.error('❌ Evening summary cron error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
