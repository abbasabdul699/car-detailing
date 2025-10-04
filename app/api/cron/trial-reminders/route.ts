import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { billingEmailService } from '@/lib/billing-email';

export async function POST(request: Request) {
  try {
    // Verify this is a legitimate cron request (add your own verification)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Running trial reminders cron job...');

    // Find detailers with trials ending in 3, 1, and 0 days
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get detailers with trials ending in 3 days
    const detailersThreeDays = await prisma.detailer.findMany({
      where: {
        trialEndsAt: {
          gte: threeDaysFromNow,
          lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
        subscription: {
          status: 'trial',
        },
      },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    // Get detailers with trials ending in 1 day
    const detailersOneDay = await prisma.detailer.findMany({
      where: {
        trialEndsAt: {
          gte: oneDayFromNow,
          lt: tomorrow,
        },
        subscription: {
          status: 'trial',
        },
      },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    // Get detailers with trials ending today
    const detailersToday = await prisma.detailer.findMany({
      where: {
        trialEndsAt: {
          gte: now,
          lt: tomorrow,
        },
        subscription: {
          status: 'trial',
        },
      },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    let emailsSent = 0;

    // Send 3-day reminders
    for (const detailer of detailersThreeDays) {
      try {
        await billingEmailService.sendTrialEndingReminder(detailer.id, 3);
        emailsSent++;
        console.log(`✅ 3-day reminder sent to ${detailer.businessName}`);
      } catch (error) {
        console.error(`❌ Failed to send 3-day reminder to ${detailer.businessName}:`, error);
      }
    }

    // Send 1-day reminders
    for (const detailer of detailersOneDay) {
      try {
        await billingEmailService.sendTrialEndingReminder(detailer.id, 1);
        emailsSent++;
        console.log(`✅ 1-day reminder sent to ${detailer.businessName}`);
      } catch (error) {
        console.error(`❌ Failed to send 1-day reminder to ${detailer.businessName}:`, error);
      }
    }

    // Send final day reminders
    for (const detailer of detailersToday) {
      try {
        await billingEmailService.sendTrialEndingReminder(detailer.id, 0);
        emailsSent++;
        console.log(`✅ Final reminder sent to ${detailer.businessName}`);
      } catch (error) {
        console.error(`❌ Failed to send final reminder to ${detailer.businessName}:`, error);
      }
    }

    console.log(`🎉 Trial reminders cron job completed. ${emailsSent} emails sent.`);

    return NextResponse.json({
      success: true,
      emailsSent,
      detailersThreeDays: detailersThreeDays.length,
      detailersOneDay: detailersOneDay.length,
      detailersToday: detailersToday.length,
    });
  } catch (error) {
    console.error('❌ Trial reminders cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
