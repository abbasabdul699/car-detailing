import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrialNotificationService {
  createTrialReminderNotifications(): Promise<void>;
  createTrialExpiredNotification(detailerId: string): Promise<void>;
}

export class TrialNotificationServiceImpl implements TrialNotificationService {
  
  /**
   * Create trial reminder notifications for detailers
   */
  async createTrialReminderNotifications(): Promise<void> {
    try {
      console.log('🔔 Creating trial reminder notifications...');
      
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
        await this.createNotification(
          detailer.id,
          `Your trial period ends in 3 days! Choose a plan to continue using ReevaCar.`,
          'trial_reminder',
          '/detailer-dashboard/subscription'
        );
      }

      // Create 1-day reminder notifications
      for (const detailer of oneDayReminders) {
        await this.createNotification(
          detailer.id,
          `Your trial period ends tomorrow! Don't miss out - choose your plan now.`,
          'trial_reminder',
          '/detailer-dashboard/subscription'
        );
      }

      console.log(`✅ Created trial reminder notifications`);
    } catch (error) {
      console.error('❌ Error creating trial reminder notifications:', error);
      throw error;
    }
  }

  /**
   * Create trial expired notification
   */
  async createTrialExpiredNotification(detailerId: string): Promise<void> {
    try {
      await this.createNotification(
        detailerId,
        `Your trial period has ended. Choose a plan to continue using ReevaCar.`,
        'trial_expired',
        '/detailer-dashboard/subscription'
      );
    } catch (error) {
      console.error(`❌ Error creating trial expired notification for ${detailerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a notification for a detailer
   */
  private async createNotification(
    detailerId: string,
    message: string,
    type: string,
    link?: string
  ): Promise<void> {
    try {
      // Check if notification already exists to avoid duplicates
      const existingNotification = await prisma.notification.findFirst({
        where: {
          detailerId,
          message,
          type,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
        },
      });

      if (existingNotification) {
        console.log(`📝 Notification already exists for detailer ${detailerId}`);
        return;
      }

      await prisma.notification.create({
        data: {
          detailerId,
          message,
          type,
          link,
          read: false,
        },
      });

      console.log(`✅ Created notification for detailer ${detailerId}: ${message}`);
    } catch (error) {
      console.error(`❌ Error creating notification for detailer ${detailerId}:`, error);
      throw error;
    }
  }
}

export const trialNotificationService = new TrialNotificationServiceImpl();
