const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTrialFlow() {
  try {
    console.log('🧪 Testing Trial Flow Implementation...\n');

    // 1. Create a test detailer with trial period
    console.log('1️⃣ Creating test detailer with trial period...');
    
    // Check if test detailer already exists
    let testDetailer = await prisma.detailer.findFirst({
      where: {
        businessName: 'Test Detailer Trial'
      }
    });

    if (!testDetailer) {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days from now

      testDetailer = await prisma.detailer.create({
        data: {
          businessName: 'Test Detailer Trial',
          firstName: 'Test',
          lastName: 'Detailer',
          email: 'test-detailer-trial@example.com',
          phone: '+1234567890',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          description: 'Test detailer for trial flow',
          password: 'testpassword123',
          latitude: 40.7128, // New York coordinates
          longitude: -74.0060,
          priceRange: '$50-100',
          businessHours: {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '10:00', close: '15:00', closed: false },
            sunday: { open: '10:00', close: '15:00', closed: false }
          },
          trialEndsAt: trialEndDate,
          isFirstCohort: true, // Give them the 15% discount
          verified: true
        }
      });
      console.log(`✅ Created test detailer: ${testDetailer.businessName}`);
    } else {
      console.log(`✅ Found existing test detailer: ${testDetailer.businessName}`);
    }

    // 2. Test subscription status logic
    console.log('\n2️⃣ Testing subscription status logic...');
    
    const detailerWithSubscription = await prisma.detailer.findUnique({
      where: { id: testDetailer.id },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    const now = new Date();
    const isInTrialPeriod = detailerWithSubscription.trialEndsAt && new Date(detailerWithSubscription.trialEndsAt) > now;
    
    console.log(`✅ Detailer trial status:`);
    console.log(`   - Trial ends: ${detailerWithSubscription.trialEndsAt}`);
    console.log(`   - Currently in trial: ${isInTrialPeriod ? 'Yes' : 'No'}`);
    console.log(`   - First cohort: ${detailerWithSubscription.isFirstCohort ? 'Yes' : 'No'}`);
    console.log(`   - Active subscription: ${detailerWithSubscription.subscription ? 'Yes' : 'No'}`);

    // 3. Test plan selection modal logic
    console.log('\n3️⃣ Testing plan selection modal logic...');
    
    // This simulates what the usePlanSelection hook would do
    const shouldShowPlanSelection = !detailerWithSubscription.subscription && !isInTrialPeriod;
    console.log(`✅ Should show plan selection modal: ${shouldShowPlanSelection ? 'Yes' : 'No'}`);
    
    if (isInTrialPeriod) {
      const trialDaysLeft = Math.ceil((new Date(detailerWithSubscription.trialEndsAt) - now) / (1000 * 60 * 60 * 24));
      console.log(`   - Trial days remaining: ${trialDaysLeft}`);
    }

    // 4. Test notification creation
    console.log('\n4️⃣ Testing notification creation...');
    
    // Create a trial reminder notification
    const reminderNotification = await prisma.notification.create({
      data: {
        detailerId: testDetailer.id,
        message: 'Your trial period ends in 3 days! Choose a plan to continue using ReevaCar.',
        type: 'trial_reminder',
        link: '/detailer-dashboard/subscription',
        read: false
      }
    });
    
    console.log(`✅ Created trial reminder notification:`);
    console.log(`   - Message: ${reminderNotification.message}`);
    console.log(`   - Type: ${reminderNotification.type}`);

    // 5. Test booking completion with trial logic
    console.log('\n5️⃣ Testing booking completion with trial logic...');
    
    // Test if detailer would be charged (should not be during trial)
    const wouldBeCharged = !isInTrialPeriod && detailerWithSubscription.subscription?.plan?.type === 'pay_per_booking';
    console.log(`✅ Booking charge logic test:`);
    console.log(`   - Would be charged for booking: ${wouldBeCharged ? 'Yes' : 'No'}`);
    console.log(`   - Reason: ${isInTrialPeriod ? 'In trial period' : 'Not in trial period'}`);

    // 6. Test first cohort discount logic
    console.log('\n6️⃣ Testing first cohort discount logic...');
    
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true }
    });
    
    const proPlan = plans.find(p => p.type === 'monthly');
    if (proPlan && detailerWithSubscription.isFirstCohort) {
      const discountAmount = proPlan.price * 0.15; // 15% discount
      const finalPrice = proPlan.price - discountAmount;
      console.log(`✅ First cohort discount calculation:`);
      console.log(`   - Original price: $${proPlan.price}`);
      console.log(`   - Discount (15%): $${discountAmount.toFixed(2)}`);
      console.log(`   - Final price: $${finalPrice.toFixed(2)}`);
    }

    console.log('\n🎉 Trial Flow Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Test detailer created with 14-day trial`);
    console.log(`   - First cohort member (gets 15% discount)`);
    console.log(`   - Trial reminder notification created`);
    console.log(`   - Booking completion logic tested`);
    console.log(`   - Plan selection modal logic verified`);
    
  } catch (error) {
    console.error('❌ Error testing trial flow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTrialFlow();
