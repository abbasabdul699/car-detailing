#!/usr/bin/env node

/**
 * Test script for local subscription functionality
 * Run with: node scripts/test-local-subscription.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLocalSubscription() {
  try {
    console.log('🧪 Testing Local Subscription System...\n');

    // 1. Check if subscription plans exist
    console.log('1️⃣ Checking subscription plans...');
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    
    console.log(`✅ Found ${plans.length} active plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price}/${plan.type === 'monthly' ? 'month' : 'booking'}`);
    });

    // 2. Check if we have a test detailer
    console.log('\n2️⃣ Checking for test detailers...');
    const detailers = await prisma.detailer.findMany({
      take: 3,
      select: {
        id: true,
        businessName: true,
        email: true,
        trialEndsAt: true,
        isFirstCohort: true,
        stripeCustomerId: true
      }
    });

    if (detailers.length === 0) {
      console.log('❌ No detailers found. Please create a detailer first.');
      return;
    }

    console.log(`✅ Found ${detailers.length} detailers:`);
    detailers.forEach(detailer => {
      console.log(`   - ${detailer.businessName} (${detailer.email})`);
      console.log(`     Trial ends: ${detailer.trialEndsAt || 'Not set'}`);
      console.log(`     First cohort: ${detailer.isFirstCohort ? 'Yes' : 'No'}`);
      console.log(`     Stripe ID: ${detailer.stripeCustomerId || 'None'}`);
    });

    // 3. Test subscription creation logic (without Stripe)
    console.log('\n3️⃣ Testing subscription creation logic...');
    
    const testDetailer = detailers[0];
    const starterPlan = plans.find(p => p.type === 'pay_per_booking');
    const proPlan = plans.find(p => p.type === 'monthly');

    if (!starterPlan || !proPlan) {
      console.log('❌ Missing required plans. Please run: node scripts/seed-subscription-plans.js');
      return;
    }

    console.log('✅ Plans found:');
    console.log(`   - Starter: ${starterPlan.name} (${starterPlan.type})`);
    console.log(`   - Pro: ${proPlan.name} (${proPlan.type})`);

    // 4. Test pay-per-booking subscription creation
    console.log('\n4️⃣ Testing pay-per-booking subscription creation...');
    
    // Check if detailer already has a subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { detailerId: testDetailer.id }
    });

    if (existingSubscription) {
      console.log(`⚠️  Detailer already has subscription: ${existingSubscription.status}`);
      console.log('   To test fresh, delete existing subscription first.');
    } else {
      console.log('✅ No existing subscription found - ready for testing');
    }

    // 5. Test the API endpoint locally
    console.log('\n5️⃣ Testing API endpoint...');
    console.log('   Run this command to test the API:');
    console.log(`   curl -X POST http://localhost:3000/api/subscription/create \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"planId": "${starterPlan.id}"}'`);
    console.log('   (Note: This will fail with 401 Unauthorized without proper auth)');

    console.log('\n✅ Local testing setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Open http://localhost:3000/detailer-login');
    console.log('2. Login with a detailer account');
    console.log('3. Navigate to /detailer-dashboard/subscription');
    console.log('4. Click "Choose Detailer Starter" to test the flow');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testLocalSubscription();
