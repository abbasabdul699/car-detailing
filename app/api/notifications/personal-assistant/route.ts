import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { detailerId, type, data } = body;

    if (!detailerId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get detailer info
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: {
        id: true,
        businessName: true,
        personalPhoneNumber: true,
        twilioPhoneNumber: true
      }
    });

    if (!detailer || !detailer.personalPhoneNumber) {
      return NextResponse.json({ error: 'Detailer or personal phone not found' }, { status: 404 });
    }

    let message = '';

    // Generate appropriate message based on notification type
    switch (type) {
      case 'new_booking':
        message = `🎉 NEW BOOKING!\n\nCustomer: ${data.customerName}\nService: ${data.services.join(', ')}\nDate: ${new Date(data.scheduledDate).toLocaleDateString()}\nTime: ${data.scheduledTime || 'TBD'}\nVehicle: ${data.vehicleType}\nLocation: ${data.vehicleLocation}\n\nReply with commands like:\n• "show bookings" - View all bookings\n• "reschedule [booking_id] to [new_date] [new_time]" - Reschedule\n• "cancel [booking_id]" - Cancel appointment`;
        break;

      case 'booking_cancelled':
        message = `❌ BOOKING CANCELLED\n\nCustomer: ${data.customerName}\nService: ${data.services.join(', ')}\nDate: ${new Date(data.scheduledDate).toLocaleDateString()}\n\nReply "show bookings" to see updated schedule.`;
        break;

      case 'booking_rescheduled':
        message = `📅 BOOKING RESCHEDULED\n\nCustomer: ${data.customerName}\nNew Date: ${new Date(data.scheduledDate).toLocaleDateString()}\nNew Time: ${data.scheduledTime || 'TBD'}\n\nReply "show upcoming" to see your schedule.`;
        break;

      case 'appointment_reminder':
        const hoursUntil = Math.round((new Date(data.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60));
        message = `⏰ APPOINTMENT REMINDER\n\nYou have an appointment in ${hoursUntil} hours:\n\nCustomer: ${data.customerName}\nService: ${data.services.join(', ')}\nTime: ${data.scheduledTime || 'TBD'}\nLocation: ${data.vehicleLocation}\n\nReply "contact ${data.customerPhone}" to reach out.`;
        break;

      case 'daily_summary':
        message = `📊 DAILY SUMMARY - ${new Date().toLocaleDateString()}\n\nToday's Stats:\n• New Bookings: ${data.newBookings}\n• Completed: ${data.completed}\n• Revenue: $${data.revenue}\n• Messages: ${data.messages}\n\nReply "summary" for more details.`;
        break;

      case 'weekly_summary':
        message = `📈 WEEKLY SUMMARY\n\nThis Week:\n• Total Bookings: ${data.totalBookings}\n• Revenue: $${data.revenue}\n• New Customers: ${data.newCustomers}\n• Messages: ${data.messages}\n\nReply "help" for available commands.`;
        break;

      default:
        message = `📱 ${detailer.businessName} Update\n\n${data.message || 'You have a new notification.'}\n\nReply "help" for available commands.`;
    }

    // Send SMS to detailer's personal phone
    await twilioClient.messages.create({
      body: message,
      from: detailer.twilioPhoneNumber,
      to: detailer.personalPhoneNumber
    });

    console.log(`✅ Personal Assistant notification sent to ${detailer.personalPhoneNumber}: ${type}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Personal Assistant notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
