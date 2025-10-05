#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const starter = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Detailer Starter' },
    });

    if (!starter) {
      console.log('Detailer Starter plan not found. Nothing to disable.');
      return;
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id: starter.id },
      data: { isActive: false },
    });

    console.log('Disabled plan:', updated.name);
  } catch (e) {
    console.error('Failed to disable Starter plan:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();


