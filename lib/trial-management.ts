import { PrismaClient } from '@prisma/client';
import { trialNotificationService } from './trial-notifications';

const prisma = new PrismaClient();

export interface TrialManagementService {
  processExpiredTrials(): Promise<void>;
  sendTrialReminders(): Promise<void>;
  extendTrial(detailerId: string, newEndDate: Date): Promise<void>;
}

export class TrialManagementServiceImpl implements TrialManagementService {
  
  /**
   * Process detailers whose trial periods have expired
   */
  async processExpiredTrials(): Promise<void> {
    try {
      console.log('🔄 Processing expired trials...');
      
      const now = new Date();
      
      // Find detailers with expired trials
      const expiredTrialDetailers = await prisma.detailer.findMany({
        where: {
          trialEndsAt: {
            lte: now, // Trial has ended
          },
          subscription: null, // No active subscription
        },
        select: {
          id: true,
          businessName: true,
          email: true,
          trialEndsAt: true,
        },
      });

      console.log(`📋 Found ${expiredTrialDetailers.length} detailers with expired trials`);

      for (const detailer of expiredTrialDetailers) {
        console.log(`⏰ Trial expired for ${detailer.businessName} (${detailer.email})`);
        
        // Create trial expired notification
        await trialNotificationService.createTrialExpiredNotification(detailer.id);
      }

      console.log(`✅ Processed ${expiredTrialDetailers.length} expired trials`);
    } catch (error) {
      console.error('❌ Error processing expired trials:', error);
      throw error;
    }
  }

  /**
   * Send trial reminder notifications
   */
  async sendTrialReminders(): Promise<void> {
    try {
      console.log('📧 Sending trial reminders...');
      
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      
      // Find detailers with trials ending in 3 days
      const threeDayReminders = await prisma.detailer.findMany({
        where: {
          trialEndsAt: {
            gte: now,
            lte: threeDaysFromNow,
          },
          subscription: null,
        },
        select: {
          id: true,
          businessName: true,
          email: true,
          trialEndsAt: true,
        },
      });

      // Find detailers with trials ending in 1 day
      const oneDayReminders = await prisma.detailer.findMany({
        where: {
          trialEndsAt: {
            gte: now,
            lte: oneDayFromNow,
          },
          subscription: null,
        },
        select: {
          id: true,
          businessName: true,
          email: true,
          trialEndsAt: true,
        },
      });

      console.log(`📋 Found ${threeDayReminders.length} detailers for 3-day reminders`);
      console.log(`📋 Found ${oneDayReminders.length} detailers for 1-day reminders`);

      // Create 3-day reminder notifications
      for (const detailer of threeDayReminders) {
        console.log(`📧 Creating 3-day trial reminder notification for ${detailer.businessName}`);
        await trialNotificationService.createTrialReminderNotifications();
      }

      // Create 1-day reminder notifications
      for (const detailer of oneDayReminders) {
        console.log(`📧 Creating 1-day trial reminder notification for ${detailer.businessName}`);
        await trialNotificationService.createTrialReminderNotifications();
      }

      console.log(`✅ Sent trial reminders`);
    } catch (error) {
      console.error('❌ Error sending trial reminders:', error);
      throw error;
    }
  }

  /**
   * Extend a detailer's trial period
   */
  async extendTrial(detailerId: string, newEndDate: Date): Promise<void> {
    try {
      console.log(`⏰ Extending trial for detailer ${detailerId} to ${newEndDate}`);
      
      await prisma.detailer.update({
        where: { id: detailerId },
        data: {
          trialEndsAt: newEndDate,
        },
      });

      console.log(`✅ Trial extended for detailer ${detailerId}`);
    } catch (error) {
      console.error(`❌ Error extending trial for detailer ${detailerId}:`, error);
      throw error;
    }
  }
}

export const trialManagementService = new TrialManagementServiceImpl();
