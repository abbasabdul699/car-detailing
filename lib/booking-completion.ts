import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import { generateShortReviewMessage } from './reviewLinks';
import { scheduleReviewLink, sendReviewLinkImmediately } from './scheduledReviews';

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export interface BookingCompletionService {
  markBookingAsCompleted(bookingId: string): Promise<void>;
  processCompletedBookings(): Promise<void>;
  chargeDetailerForBooking(bookingId: string, detailerId: string): Promise<void>;
  sendReviewLink(bookingId: string): Promise<void>;
  sendReviewLinkImmediately(bookingId: string): Promise<void>;
}

export class BookingCompletionServiceImpl implements BookingCompletionService {
  
  /**
   * Mark a booking as completed when the appointment time has passed
   * and it hasn't been cancelled or rescheduled
   */
  async markBookingAsCompleted(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          detailer: true,
          customer: true,
        },
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      // Check if booking is still scheduled and appointment time has passed
      const now = new Date();
      const appointmentTime = new Date(booking.appointmentTime);
      
      if (booking.status === 'scheduled' && now > appointmentTime) {
        // Mark as completed
        await prisma.booking.update({
          where: { id: bookingId },
          data: { 
            status: 'completed',
            completedAt: now,
          },
        });

        // Charge the detailer for the booking
        await this.chargeDetailerForBooking(bookingId, booking.detailerId);
        
        // Send review link to customer
        await this.sendReviewLink(bookingId);
        
        console.log(`✅ Booking ${bookingId} marked as completed, charged, and review link sent`);
      }
    } catch (error) {
      console.error(`❌ Error marking booking ${bookingId} as completed:`, error);
      throw error;
    }
  }

  /**
   * Process all bookings that should be marked as completed
   * This runs as a cron job
   */
  async processCompletedBookings(): Promise<void> {
    try {
      console.log('🔄 Processing completed bookings...');
      
      // Find all scheduled bookings where appointment time has passed
      const now = new Date();
      const completedBookings = await prisma.booking.findMany({
        where: {
          status: 'scheduled',
          appointmentTime: {
            lt: now, // Appointment time has passed
          },
        },
        include: {
          detailer: true,
        },
      });

      console.log(`📋 Found ${completedBookings.length} bookings to process`);

      for (const booking of completedBookings) {
        await this.markBookingAsCompleted(booking.id);
      }

      console.log(`✅ Processed ${completedBookings.length} completed bookings`);
    } catch (error) {
      console.error('❌ Error processing completed bookings:', error);
      throw error;
    }
  }

  /**
   * Charge the detailer $3 for a completed booking
   */
  async chargeDetailerForBooking(bookingId: string, detailerId: string): Promise<void> {
    try {
      const detailer = await prisma.detailer.findUnique({
        where: { id: detailerId },
        select: {
          id: true,
          trialEndsAt: true,
        },
      });

      if (!detailer) {
        throw new Error(`Detailer ${detailerId} not found`);
      }

      // Check if detailer is still in trial period
      const now = new Date();
      if (detailer.trialEndsAt && new Date(detailer.trialEndsAt) > now) {
        console.log(`🆓 Detailer ${detailerId} is in trial period - no charge for booking ${bookingId}`);
        return;
      }

      // Check if detailer is on Starter plan (pay-per-booking)
      const subscription = await prisma.subscription.findFirst({
        where: {
          detailerId: detailerId,
          status: 'active',
        },
        include: {
          plan: true,
        },
      });

      // Only charge if detailer is on Starter plan (pay-per-booking)
      if (subscription?.plan.type === 'pay_per_booking') {
        // Create a charge record
        await prisma.charge.create({
          data: {
            detailerId: detailerId,
            bookingId: bookingId,
            amount: 300, // $3.00 in cents
            status: 'completed',
            description: 'Pay-per-booking fee',
            chargedAt: new Date(),
          },
        });

        console.log(`💰 Charged detailer ${detailerId} $3.00 for booking ${bookingId}`);
      } else {
        console.log(`ℹ️ Detailer ${detailerId} is on Pro plan - no per-booking charge`);
      }
    } catch (error) {
      console.error(`❌ Error charging detailer for booking ${bookingId}:`, error);
      throw error;
    }
  }

  /**
   * Send a Google Review link to the customer after their appointment is completed
   * Uses the scheduled review system for delayed sending
   */
  async sendReviewLink(bookingId: string): Promise<void> {
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

      // Schedule the review link to be sent 30 minutes after the appointment time
      // This gives customers time to experience the service
      const appointmentDate = new Date(booking.scheduledDate);
      const [hours, minutes] = booking.scheduledTime.split(':');
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const reviewSendTime = new Date(appointmentDate.getTime() + (30 * 60 * 1000)); // 30 minutes after appointment
      
      await scheduleReviewLink(bookingId, reviewSendTime);
      
      console.log(`⏰ Review link scheduled for booking ${bookingId} (30 minutes after appointment: ${reviewSendTime.toISOString()})`);
    } catch (error) {
      console.error(`❌ Error scheduling review link for booking ${bookingId}:`, error);
      throw error;
    }
  }

  /**
   * Send a review link immediately (for testing or immediate sending)
   */
  async sendReviewLinkImmediately(bookingId: string): Promise<void> {
    try {
      await sendReviewLinkImmediately(bookingId);
      console.log(`📝 Review link sent immediately for booking ${bookingId}`);
    } catch (error) {
      console.error(`❌ Error sending immediate review link for booking ${bookingId}:`, error);
      throw error;
    }
  }
}

export const bookingCompletionService = new BookingCompletionServiceImpl();
