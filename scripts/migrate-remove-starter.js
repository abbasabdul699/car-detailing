#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('🔄 Removing Starter plan from local DB...');

    const starterPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Detailer Starter' },
      select: { id: true },
    });

    if (!starterPlan) {
      console.log('✅ No Starter plan found. Nothing to migrate.');
      return;
    }

    // Deactivate the plan so it no longer appears anywhere
    await prisma.subscriptionPlan.update({
      where: { id: starterPlan.id },
      data: { isActive: false },
    });

    // Find all subscriptions on Starter
    const starterSubs = await prisma.subscription.findMany({
      where: { planId: starterPlan.id },
      select: { id: true, detailerId: true },
    });

    console.log(`📋 Found ${starterSubs.length} Starter subscriptions`);

    if (starterSubs.length === 0) {
      console.log('✅ No subscriptions to migrate.');
      return;
    }

    // Cancel/remove local subscriptions for Starter
    const subIds = starterSubs.map((s) => s.id);
    await prisma.subscription.deleteMany({ where: { id: { in: subIds } } });

    // Notify affected detailers to upgrade to Pro
    const detailerIds = [...new Set(starterSubs.map((s) => s.detailerId))];
    for (const detailerId of detailerIds) {
      await prisma.notification.create({
        data: {
          detailerId,
          type: 'plan_update',
          message:
            'The Starter plan has been discontinued. Please upgrade to Detailer Pro to continue.',
          link: '/detailer-dashboard/subscription',
        },
      });
    }

    console.log(`✅ Removed ${starterSubs.length} Starter subscriptions and notified ${detailerIds.length} detailers.`);
  } catch (e) {
    console.error('❌ Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();


