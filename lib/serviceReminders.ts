import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const REMINDER_WINDOW_START_HOURS = 23.75; // 23h 45m
const REMINDER_WINDOW_END_HOURS = 24.25;   // 24h 15m

function formatAppointmentTime(date: Date, timezone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || 'America/New_York',
  }).format(date);
}

function buildReminderMessage(booking: {
  customerName: string | null;
  scheduledDate: Date;
  services: string[];
  detailer: { timezone: string | null };
}): string {
  const firstName = booking.customerName?.trim()?.split(/\s+/)[0] || 'there';
  const timeText = formatAppointmentTime(booking.scheduledDate, booking.detailer.timezone || undefined);
  const primaryService = booking.services?.[0]?.trim();

  if (primaryService) {
    return `Hey ${firstName}, just a reminder that you have an appointment for ${timeText} tomorrow for a ${primaryService}.`;
  }

  return `Hey ${firstName}, just a reminder that you have an appointment for ${timeText} tomorrow.`;
}

export async function processServiceReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_START_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_END_HOURS * 60 * 60 * 1000);

  console.log(`🔄 Processing 24h booking reminders between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['pending', 'confirmed'] },
      customerPhone: { not: '' },
      scheduledDate: {
        gte: windowStart,
        lte: windowEnd,
      },
      detailer: {
        smsEnabled: true,
        twilioPhoneNumber: { not: null },
      },
    },
    include: {
      detailer: {
        select: {
          id: true,
          smsEnabled: true,
          twilioPhoneNumber: true,
          timezone: true,
        },
      },
    },
  });

  console.log(`📋 Found ${upcomingBookings.length} bookings eligible for 24h reminders`);

  for (const booking of upcomingBookings) {
    try {
      const customerPhone = booking.customerPhone?.trim();
      const fromNumber = booking.detailer.twilioPhoneNumber?.trim();
      if (!customerPhone || !fromNumber) continue;

      const conversation = await prisma.conversation.upsert({
        where: {
          detailerId_customerPhone: {
            detailerId: booking.detailerId,
            customerPhone,
          },
        },
        create: {
          detailerId: booking.detailerId,
          customerPhone,
          customerName: booking.customerName || undefined,
          status: 'active',
          channel: 'sms',
        },
        update: {
          customerName: booking.customerName || undefined,
          status: 'active',
          channel: 'sms',
        },
      });

      const reminderKey = `booking-reminder-24h:${booking.id}`;
      const alreadySent = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: 'outbound',
          vapiCallId: reminderKey,
        },
        select: { id: true },
      });

      if (alreadySent) {
        continue;
      }

      const reminderMessage = buildReminderMessage({
        customerName: booking.customerName,
        scheduledDate: booking.scheduledDate,
        services: booking.services,
        detailer: { timezone: booking.detailer.timezone },
      });

      const twilioMessage = await twilioClient.messages.create({
        body: reminderMessage,
        from: fromNumber,
        to: customerPhone,
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'outbound',
          channel: 'sms',
          content: reminderMessage,
          status: twilioMessage.status || 'sent',
          twilioSid: twilioMessage.sid,
          vapiCallId: reminderKey,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          status: 'active',
        },
      });

      console.log(`✅ Sent 24h reminder for booking ${booking.id} to ${customerPhone}`);
    } catch (error) {
      console.error(`❌ Failed sending 24h reminder for booking ${booking.id}:`, error);
    }
  }

  console.log('✅ 24h booking reminder processing complete');
}
