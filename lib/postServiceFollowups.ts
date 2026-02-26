import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const DEFAULT_DELAY_MINUTES = 60;
const WINDOW_TOLERANCE_MINUTES = 15;
const CANDIDATE_LOOKBACK_HOURS = 48;

function parseClockTimeToMinutes(value: string): number | null {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  const hourRaw = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (!Number.isFinite(hourRaw) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hourRaw < 1 || hourRaw > 12) return null;
    let h24 = hourRaw % 12;
    if (meridiem === 'pm') h24 += 12;
    return h24 * 60 + minute;
  }

  if (hourRaw < 0 || hourRaw > 23) return null;
  return hourRaw * 60 + minute;
}

function parseDurationMinutesFromRange(range?: string | null): number | null {
  if (!range) return null;
  const parts = range.split(/\s*[-–—]\s*/);
  if (parts.length < 2) return null;

  const startMin = parseClockTimeToMinutes(parts[0]);
  const endMin = parseClockTimeToMinutes(parts[1]);
  if (startMin == null || endMin == null) return null;

  let duration = endMin - startMin;
  if (duration <= 0) duration += 24 * 60;
  return duration;
}

function isWithinPostServiceSendWindow(
  appointmentEnd: Date,
  now: Date,
  delayMinutes: number
): boolean {
  const targetSendAt = new Date(appointmentEnd.getTime() + delayMinutes * 60 * 1000);
  const sendWindowStart = new Date(now.getTime() - WINDOW_TOLERANCE_MINUTES * 60 * 1000);
  const sendWindowEnd = new Date(now.getTime() + WINDOW_TOLERANCE_MINUTES * 60 * 1000);
  return targetSendAt >= sendWindowStart && targetSendAt <= sendWindowEnd;
}

function getDelayMinutes(): number {
  const raw = process.env.POST_SERVICE_FOLLOWUP_DELAY_MINUTES;
  if (!raw) return DEFAULT_DELAY_MINUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DELAY_MINUTES;
  return Math.round(parsed);
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

function buildPostServiceMessage(input: {
  customerName: string | null;
  businessName?: string | null;
  serviceName?: string | null;
  reviewLink?: string | null;
}): string {
  const firstName = input.customerName?.trim()?.split(/\s+/)[0] || 'there';
  const serviceLine = input.serviceName ? ` with your ${input.serviceName}` : '';
  const businessLine = input.businessName ? ` at ${input.businessName}` : '';

  if (input.reviewLink) {
    return `Hey ${firstName}, thanks again for your service${businessLine}${serviceLine}. We hope everything went great. If you enjoyed it, we'd really appreciate a quick review: ${input.reviewLink}`;
  }

  return `Hey ${firstName}, thanks again for your service${businessLine}${serviceLine}. We hope everything went great. We'd love your feedback when you have a minute.`;
}

export async function processPostServiceFollowups(): Promise<void> {
  const delayMinutes = getDelayMinutes();
  const now = new Date();
  const candidateStart = new Date(now.getTime() - CANDIDATE_LOOKBACK_HOURS * 60 * 60 * 1000);

  console.log(
    `🔄 Processing post-service followups ${delayMinutes}m after appointment end (candidates since ${candidateStart.toISOString()})`
  );

  const completedBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['confirmed', 'completed'] },
      customerPhone: { not: '' },
      scheduledDate: {
        gte: candidateStart,
        lte: now,
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
          businessName: true,
          smsEnabled: true,
          twilioPhoneNumber: true,
          googleReviewLink: true,
        },
      },
      event: {
        select: {
          id: true,
        },
      },
    },
  });

  console.log(`📋 Found ${completedBookings.length} completed bookings eligible for post-service followups`);

  for (const booking of completedBookings) {
    try {
      const bookingDurationMinutes =
        (typeof booking.duration === 'number' && booking.duration > 0
          ? booking.duration
          : parseDurationMinutesFromRange(booking.scheduledTime)) || 120;
      const appointmentEnd = new Date(booking.scheduledDate.getTime() + bookingDurationMinutes * 60 * 1000);
      if (!isWithinPostServiceSendWindow(appointmentEnd, now, delayMinutes)) {
        continue;
      }

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

      const followupKey = `post-service-followup-booking:${booking.id}`;
      const alreadySent = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: 'outbound',
          vapiCallId: followupKey,
        },
        select: { id: true },
      });

      if (alreadySent) continue;

      const message = buildPostServiceMessage({
        customerName: booking.customerName || null,
        businessName: booking.detailer.businessName,
        serviceName: booking.services?.[0] || null,
        reviewLink: booking.detailer.googleReviewLink || null,
      });

      const twilioMessage = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: customerPhone,
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'outbound',
          channel: 'sms',
          content: message,
          status: twilioMessage.status || 'sent',
          twilioSid: twilioMessage.sid,
          vapiCallId: followupKey,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          status: 'active',
        },
      });

      console.log(`✅ Sent post-service followup for booking ${booking.id} to ${customerPhone}`);
    } catch (error) {
      console.error(`❌ Failed sending post-service followup for booking ${booking.id}:`, error);
    }
  }

  const appointmentEvents = await prisma.event.findMany({
    where: {
      eventType: 'appointment',
      date: {
        gte: candidateStart,
        lte: now,
      },
    },
    include: {
      detailer: {
        select: {
          id: true,
          businessName: true,
          smsEnabled: true,
          twilioPhoneNumber: true,
          googleReviewLink: true,
        },
      },
      booking: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  console.log(`📋 Found ${appointmentEvents.length} completed appointment events eligible for post-service followups`);

  for (const event of appointmentEvents) {
    try {
      if (event.booking && !['confirmed', 'completed'].includes(event.booking.status)) {
        console.log(`⏭️ Skipping event ${event.id}: linked booking status is ${event.booking.status}`);
        continue;
      }

      const eventDurationMinutes = parseDurationMinutesFromRange(event.time) || 60;
      const appointmentEnd = new Date(event.date.getTime() + eventDurationMinutes * 60 * 1000);
      if (!isWithinPostServiceSendWindow(appointmentEnd, now, delayMinutes)) {
        console.log(`⏭️ Skipping event ${event.id}: outside post-service send window`);
        continue;
      }

      const metadata = parseEventMetadata(event.description);
      const customerPhone = metadata.customerPhone?.trim();
      const fromNumber = event.detailer.twilioPhoneNumber?.trim();

      if (!event.detailer.smsEnabled) {
        console.log(`⏭️ Skipping event ${event.id}: detailer smsEnabled is false`);
        continue;
      }
      if (!fromNumber) {
        console.log(`⏭️ Skipping event ${event.id}: missing detailer Twilio number`);
        continue;
      }
      if (!customerPhone) {
        console.log(`⏭️ Skipping event ${event.id}: missing customer phone in metadata`);
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

      const followupKey = event.bookingId
        ? `post-service-followup-booking:${event.bookingId}`
        : `post-service-followup-event:${event.id}`;
      const alreadySent = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: 'outbound',
          vapiCallId: followupKey,
        },
        select: { id: true },
      });

      if (alreadySent) {
        console.log(`↩️ Skipping event ${event.id}: post-service followup already sent`);
        continue;
      }

      const message = buildPostServiceMessage({
        customerName: metadata.customerName || null,
        businessName: event.detailer.businessName,
        serviceName: metadata.services?.[0] || null,
        reviewLink: event.detailer.googleReviewLink || null,
      });

      const twilioMessage = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: customerPhone,
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'outbound',
          channel: 'sms',
          content: message,
          status: twilioMessage.status || 'sent',
          twilioSid: twilioMessage.sid,
          vapiCallId: followupKey,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          status: 'active',
        },
      });

      console.log(`✅ Sent post-service followup for event ${event.id} to ${customerPhone}`);
    } catch (error) {
      console.error(`❌ Failed sending post-service followup for event ${event.id}:`, error);
    }
  }

  console.log('✅ Post-service followup processing complete');
}
