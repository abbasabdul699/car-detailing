import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function GET(request: NextRequest) {
  try {
    console.log('📅 === WEEKLY SUMMARY CRON START ===');
    
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
        // Get this week's data
        const today = new Date();
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // This week's statistics
        const thisWeekBookings = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            createdAt: { gte: startOfWeek, lte: endOfWeek }
          }
        });

        const thisWeekCompleted = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            scheduledDate: { gte: startOfWeek, lte: endOfWeek },
            status: 'completed'
          }
        });

        const thisWeekCancelled = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            scheduledDate: { gte: startOfWeek, lte: endOfWeek },
            status: 'cancelled'
          }
        });

        // Next week's appointments
        const nextWeekStart = new Date(startOfWeek);
        nextWeekStart.setDate(startOfWeek.getDate() + 7);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);

        const nextWeekAppointments = await prisma.booking.findMany({
          where: {
            detailerId: detailer.id,
            scheduledDate: { gte: nextWeekStart, lte: nextWeekEnd },
            status: { in: ['confirmed', 'pending'] }
          },
          orderBy: { scheduledDate: 'asc' },
          select: {
            customerName: true,
            services: true,
            scheduledDate: true,
            scheduledTime: true
          }
        });

        // Build weekly summary message
        let message = `📊 Weekly Summary for ${detailer.businessName}:\n\n`;
        
        // This week's performance
        message += `📈 THIS WEEK'S PERFORMANCE:\n`;
        message += `• New bookings: ${thisWeekBookings}\n`;
        message += `• Completed appointments: ${thisWeekCompleted}\n`;
        message += `• Cancelled appointments: ${thisWeekCancelled}\n\n`;

        // Success rate calculation
        const totalScheduled = thisWeekCompleted + thisWeekCancelled;
        const successRate = totalScheduled > 0 ? Math.round((thisWeekCompleted / totalScheduled) * 100) : 0;
        message += `📊 Success rate: ${successRate}%\n\n`;

        // Next week's preparation
        if (nextWeekAppointments.length > 0) {
          message += `🔮 NEXT WEEK'S SCHEDULE (${nextWeekAppointments.length} appointments):\n`;
          nextWeekAppointments.forEach(appointment => {
            const date = appointment.scheduledDate.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            });
            message += `• ${date}: ${appointment.customerName} - ${appointment.services.join(', ')} at ${appointment.scheduledTime || 'TBD'}\n`;
          });
          message += '\n';
        } else {
          message += `🔮 No appointments scheduled for next week\n\n`;
        }

        // Add motivational message
        message += `💪 Great week! Keep up the excellent work. Reply "help" for more commands.`;

        // Send weekly summary to detailer's personal phone
        await twilioClient.messages.create({
          body: message,
          from: detailer.personalAssistantPhoneNumber!,
          to: detailer.personalPhoneNumber!
        });

        console.log(`✅ Weekly summary sent to ${detailer.businessName}`);

      } catch (error) {
        console.error(`❌ Error sending weekly summary to ${detailer.businessName}:`, error);
      }
    }

    console.log('✅ Weekly summaries completed');
    return new NextResponse('Weekly summaries sent', { status: 200 });

  } catch (error) {
    console.error('❌ Weekly summary cron error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
