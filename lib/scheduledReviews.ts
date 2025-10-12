/**
 * Scheduled Review System
 * Handles delayed sending of review links after appointment completion
 */

import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import { generateShortReviewMessage } from './reviewLinks';

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export interface ScheduledReview {
  id: string;
  bookingId: string;
  customerPhone: string;
  detailerId: string;
  businessName: string;
  customerName?: string;
  serviceType?: string;
  scheduledFor: Date;
  sent: boolean;
  createdAt: Date;
}

/**
 * Schedule a review link to be sent after a delay or at a specific time
 * @param bookingId - The booking ID
 * @param delayOrTime - Hours to wait before sending (number) or specific datetime (Date)
 */
export async function scheduleReviewLink(bookingId: string, delayOrTime: number | Date = 2): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        detailer: {
          select: {
            businessName: true,
            twilioPhoneNumber: true,
            smsEnabled: true,
          }
        }
      },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    if (!booking.detailer.smsEnabled || !booking.detailer.twilioPhoneNumber) {
      console.log(`📱 Detailer ${booking.detailerId} has SMS disabled - skipping review link`);
      return;
    }

    // Calculate when to send the review
    const scheduledFor = typeof delayOrTime === 'number' 
      ? new Date(Date.now() + (delayOrTime * 60 * 60 * 1000))
      : delayOrTime;

    // Store the scheduled review in the database
    await prisma.scheduledReview.create({
      data: {
        bookingId,
        customerPhone: booking.customerPhone,
        detailerId: booking.detailerId,
        businessName: booking.detailer.businessName,
        customerName: booking.customerName || null,
        serviceType: booking.services[0] || null,
        scheduledFor,
        sent: false,
      },
    });

    console.log(`⏰ Review link scheduled for booking ${bookingId} at ${scheduledFor.toISOString()}`);
  } catch (error) {
    console.error(`❌ Error scheduling review link for booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Send a review link immediately (for testing or immediate sending)
 * @param bookingId - The booking ID
 */
export async function sendReviewLinkImmediately(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        detailer: {
          select: {
            businessName: true,
            twilioPhoneNumber: true,
            smsEnabled: true,
            googleReviewLink: true,
          }
        }
      },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    if (!booking.detailer.smsEnabled || !booking.detailer.twilioPhoneNumber) {
      console.log(`📱 Detailer ${booking.detailerId} has SMS disabled - skipping review link`);
      return;
    }

    const reviewMessage = generateShortReviewMessage({
      detailerId: booking.detailerId,
      businessName: booking.detailer.businessName,
      customerName: booking.customerName || undefined,
      serviceType: booking.services[0] || undefined,
      customReviewLink: booking.detailer.googleReviewLink || undefined,
    });

    // Send the review message
    await twilioClient.messages.create({
      body: reviewMessage,
      from: booking.detailer.twilioPhoneNumber,
      to: booking.customerPhone,
    });

    console.log(`📝 Review link sent immediately to customer ${booking.customerPhone} for booking ${bookingId}`);
  } catch (error) {
    console.error(`❌ Error sending review link for booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Process scheduled review links that are due to be sent
 * This should be called by a cron job
 */
export async function processScheduledReviews(): Promise<void> {
  try {
    console.log('🔄 Processing scheduled review links...');
    
    const now = new Date();
    const dueReviews = await prisma.scheduledReview.findMany({
      where: {
        sent: false,
        scheduledFor: {
          lte: now, // Due to be sent
        },
      },
      include: {
        booking: {
          include: {
            detailer: {
              select: {
                twilioPhoneNumber: true,
                smsEnabled: true,
                googleReviewLink: true,
              }
            }
          }
        }
      },
    });

    console.log(`📋 Found ${dueReviews.length} review links to send`);

    for (const scheduledReview of dueReviews) {
      try {
        // Check if detailer still has SMS enabled
        if (!scheduledReview.booking.detailer.smsEnabled || !scheduledReview.booking.detailer.twilioPhoneNumber) {
          console.log(`📱 Detailer ${scheduledReview.detailerId} has SMS disabled - marking review as sent`);
          await prisma.scheduledReview.update({
            where: { id: scheduledReview.id },
            data: { sent: true },
          });
          continue;
        }

        const reviewMessage = generateShortReviewMessage({
          detailerId: scheduledReview.detailerId,
          businessName: scheduledReview.businessName,
          customerName: scheduledReview.customerName || undefined,
          serviceType: scheduledReview.serviceType || undefined,
          customReviewLink: scheduledReview.booking.detailer.googleReviewLink || undefined,
        });

        // Send the review message
        await twilioClient.messages.create({
          body: reviewMessage,
          from: scheduledReview.booking.detailer.twilioPhoneNumber,
          to: scheduledReview.customerPhone,
        });

        // Mark as sent
        await prisma.scheduledReview.update({
          where: { id: scheduledReview.id },
          data: { sent: true },
        });

        console.log(`📝 Review link sent to customer ${scheduledReview.customerPhone} for booking ${scheduledReview.bookingId}`);
      } catch (error) {
        console.error(`❌ Error sending scheduled review ${scheduledReview.id}:`, error);
      }
    }

    console.log(`✅ Processed ${dueReviews.length} scheduled review links`);
  } catch (error) {
    console.error('❌ Error processing scheduled reviews:', error);
    throw error;
  }
}
