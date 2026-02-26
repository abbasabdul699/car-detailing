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

function parseEventMetadata(description?: string | null): {
  customerName?: string | null;
  customerPhone?: string | null;
  services?: string[] | null;
} {
  if (!description) return {};

  const marker = '__METADATA__:';
  const idx = description.indexOf(marker);
  if (idx === -1) return {};

  const rawJson = description.slice(idx + marker.length).trim();
  try {
    const parsed = JSON.parse(rawJson) as {
      customerName?: string | null;
      customerPhone?: string | null;
      services?: string[] | null;
    };
    return parsed || {};
  } catch {
    return {};
  }
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

  // Calendar-created appointments may exist as events without a Booking row.
  // Process those too so reminders still send from calendar scheduling flow.
  const upcomingAppointmentEvents = await prisma.event.findMany({
    where: {
      eventType: 'appointment',
      bookingId: null,
      date: {
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

  console.log(`📋 Found ${upcomingAppointmentEvents.length} calendar appointment events eligible for 24h reminders`);

  for (const event of upcomingAppointmentEvents) {
    try {
      const metadata = parseEventMetadata(event.description);
      const customerPhone = metadata.customerPhone?.trim();
      const fromNumber = event.detailer.twilioPhoneNumber?.trim();
      if (!customerPhone || !fromNumber) {
        continue;
      }

      const conversation = await prisma.conversation.upsert({
        where: {
          detailerId_customerPhone: {
            detailerId: event.detailerId,
            customerPhone,
          },
        },
        create: {
          detailerId: event.detailerId,
          customerPhone,
          customerName: metadata.customerName || undefined,
          status: 'active',
          channel: 'sms',
        },
        update: {
          customerName: metadata.customerName || undefined,
          status: 'active',
          channel: 'sms',
        },
      });

      const reminderKey = `event-reminder-24h:${event.id}`;
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
        customerName: metadata.customerName || null,
        scheduledDate: event.date,
        services: metadata.services || [],
        detailer: { timezone: event.detailer.timezone },
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

      console.log(`✅ Sent 24h reminder for calendar event ${event.id} to ${customerPhone}`);
    } catch (error) {
      console.error(`❌ Failed sending 24h reminder for calendar event ${event.id}:`, error);
    }
  }

  console.log('✅ 24h booking reminder processing complete');
}
