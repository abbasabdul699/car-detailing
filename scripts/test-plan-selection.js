const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPlanSelection() {
  try {
    console.log('🧪 Testing Plan Selection Implementation...\n');

    // 1. Check if subscription plans exist
    console.log('1️⃣ Checking subscription plans...');
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    
    console.log(`✅ Found ${plans.length} active plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price}/${plan.type}`);
    });

    // 2. Check detailer with trial period
    console.log('\n2️⃣ Checking detailer trial status...');
    const detailer = await prisma.detailer.findFirst({
      where: {
        trialEndsAt: {
          not: null
        }
      },
      select: {
        id: true,
        businessName: true,
        trialEndsAt: true,
        isFirstCohort: true,
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (detailer) {
      console.log(`✅ Found detailer with trial: ${detailer.businessName}`);
      console.log(`   - Trial ends: ${detailer.trialEndsAt}`);
      console.log(`   - First cohort: ${detailer.isFirstCohort ? 'Yes' : 'No'}`);
      console.log(`   - Active subscription: ${detailer.subscription ? 'Yes' : 'No'}`);
      
      if (detailer.subscription) {
        console.log(`   - Current plan: ${detailer.subscription.plan.name}`);
        console.log(`   - Status: ${detailer.subscription.status}`);
      }
    } else {
      console.log('ℹ️ No detailers with trial periods found');
    }

    // 3. Test trial management logic
    console.log('\n3️⃣ Testing trial management logic...');
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    const trialDetailers = await prisma.detailer.findMany({
      where: {
        trialEndsAt: {
          gte: now,
          lte: threeDaysFromNow
        },
        subscription: null
      },
      select: {
        id: true,
        businessName: true,
        trialEndsAt: true
      }
    });

    console.log(`✅ Found ${trialDetailers.length} detailers with trials ending in 3 days:`);
    trialDetailers.forEach(d => {
      const daysLeft = Math.ceil((new Date(d.trialEndsAt) - now) / (1000 * 60 * 60 * 24));
      console.log(`   - ${d.businessName}: ${daysLeft} days left`);
    });

    // 4. Check notifications
    console.log('\n4️⃣ Checking trial-related notifications...');
    const trialNotifications = await prisma.notification.findMany({
      where: {
        type: {
          in: ['trial_reminder', 'trial_expired']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`✅ Found ${trialNotifications.length} trial-related notifications:`);
    trialNotifications.forEach(notif => {
      console.log(`   - ${notif.type}: ${notif.message}`);
      console.log(`     Created: ${notif.createdAt}`);
    });

    // 5. Test booking completion logic
    console.log('\n5️⃣ Testing booking completion logic...');
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: 'completed'
      },
      include: {
        detailer: {
          select: {
            id: true,
            businessName: true,
            trialEndsAt: true,
            subscription: {
              include: {
                plan: true
              }
            }
          }
        }
      },
      take: 3
    });

    console.log(`✅ Found ${completedBookings.length} completed bookings:`);
    completedBookings.forEach(booking => {
      const isInTrial = booking.detailer.trialEndsAt && new Date(booking.detailer.trialEndsAt) > now;
      console.log(`   - Booking ${booking.id}:`);
      console.log(`     Detailer: ${booking.detailer.businessName}`);
      console.log(`     In trial: ${isInTrial ? 'Yes' : 'No'}`);
      console.log(`     Plan: ${booking.detailer.subscription?.plan?.name || 'No plan'}`);
    });

    console.log('\n🎉 Plan Selection Implementation Test Complete!');
    
  } catch (error) {
    console.error('❌ Error testing plan selection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPlanSelection();
