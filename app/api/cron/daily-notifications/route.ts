import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 === DAILY NOTIFICATIONS CRON START ===');
    
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
        
        // Today's appointments
        const todaysAppointments = await prisma.booking.findMany({
          where: {
            detailerId: detailer.id,
            scheduledDate: { gte: startOfToday, lt: endOfToday },
            status: { in: ['confirmed', 'pending'] }
          },
          orderBy: { scheduledTime: 'asc' },
          select: {
            customerName: true,
            services: true,
            scheduledTime: true,
            vehicleType: true
          }
        });

        // Today's new bookings count
        const todaysBookingCount = await prisma.booking.count({
          where: {
            detailerId: detailer.id,
            createdAt: { gte: startOfToday, lt: endOfToday }
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
            scheduledTime: true,
            vehicleType: true
          }
        });

        // Build daily summary message
        let message = `🌅 Good morning! Here's your daily business summary for ${detailer.businessName}:\n\n`;
        
        // Today's appointments
        if (todaysAppointments.length > 0) {
          message += `📅 TODAY'S APPOINTMENTS (${todaysAppointments.length}):\n`;
          todaysAppointments.forEach(appointment => {
            message += `• ${appointment.customerName} - ${appointment.services.join(', ')} at ${appointment.scheduledTime || 'TBD'}\n`;
          });
          message += '\n';
        } else {
          message += `📅 No appointments scheduled for today\n\n`;
        }

        // Today's new bookings
        if (todaysBookingCount > 0) {
          message += `📈 New bookings today: ${todaysBookingCount}\n\n`;
        }

        // Tomorrow's preparation
        if (tomorrowsAppointments.length > 0) {
          message += `🔮 TOMORROW'S PREPARATION (${tomorrowsAppointments.length} appointments):\n`;
          tomorrowsAppointments.forEach(appointment => {
            message += `• ${appointment.customerName} - ${appointment.services.join(', ')} at ${appointment.scheduledTime || 'TBD'}\n`;
          });
          message += '\n';
        }

        // Add motivational message
        message += `💪 Have a great day! Reply "help" for more commands.`;

        // Send notification to detailer's personal phone
        await twilioClient.messages.create({
          body: message,
          from: detailer.personalAssistantPhoneNumber!,
          to: detailer.personalPhoneNumber!
        });

        console.log(`✅ Daily notification sent to ${detailer.businessName}`);

      } catch (error) {
        console.error(`❌ Error sending notification to ${detailer.businessName}:`, error);
      }
    }

    console.log('✅ Daily notifications completed');
    return new NextResponse('Daily notifications sent', { status: 200 });

  } catch (error) {
    console.error('❌ Daily notifications cron error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
