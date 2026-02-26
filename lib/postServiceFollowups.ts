import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const DEFAULT_DELAY_MINUTES = 60;
const WINDOW_TOLERANCE_MINUTES = 15;

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
  const windowStart = new Date(now.getTime() - (delayMinutes + WINDOW_TOLERANCE_MINUTES) * 60 * 1000);
  const windowEnd = new Date(now.getTime() - (delayMinutes - WINDOW_TOLERANCE_MINUTES) * 60 * 1000);

  console.log(
    `🔄 Processing post-service followups ${delayMinutes}m after appointment between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`
  );

  const completedBookings = await prisma.booking.findMany({
    where: {
      status: 'completed',
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
          businessName: true,
          smsEnabled: true,
          twilioPhoneNumber: true,
          googleReviewLink: true,
        },
      },
    },
  });

  console.log(`📋 Found ${completedBookings.length} completed bookings eligible for post-service followups`);

  for (const booking of completedBookings) {
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
      bookingId: null,
      date: {
        gte: windowStart,
        lte: windowEnd,
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
    },
  });

  console.log(`📋 Found ${appointmentEvents.length} completed appointment events eligible for post-service followups`);

  for (const event of appointmentEvents) {
    try {
      const metadata = parseEventMetadata(event.description);
      const customerPhone = metadata.customerPhone?.trim();
      const fromNumber = event.detailer.twilioPhoneNumber?.trim();

      if (!event.detailer.smsEnabled) continue;
      if (!customerPhone || !fromNumber) continue;

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

      const followupKey = `post-service-followup-event:${event.id}`;
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
