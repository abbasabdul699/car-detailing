const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBookingCompletion() {
  try {
    console.log('🧪 Testing Booking Completion System');
    console.log('=====================================');

    // 1. Check current detailers and their subscription status
    console.log('\n📋 Current Detailers:');
    const detailers = await prisma.detailer.findMany({
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    detailers.forEach((detailer, index) => {
      const plan = detailer.subscription?.plan;
      console.log(`${index + 1}. ${detailer.businessName}`);
      console.log(`   Plan: ${plan?.name || 'No subscription'} (${plan?.type || 'N/A'})`);
      console.log(`   First Cohort: ${detailer.isFirstCohort ? 'Yes' : 'No'}`);
      console.log('');
    });

    // 2. Check for any existing bookings
    console.log('📅 Current Bookings:');
    const bookings = await prisma.booking.findMany({
      include: {
        detailer: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (bookings.length === 0) {
      console.log('   No bookings found');
    } else {
      bookings.forEach((booking, index) => {
        const customerName = booking.customer?.name || 'Unknown Customer';
        console.log(`${index + 1}. ${booking.detailer.businessName} - ${customerName}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Appointment: ${booking.appointmentTime}`);
        console.log(`   Created: ${booking.createdAt}`);
        console.log('');
      });
    }

    // 3. Check for any existing charges
    console.log('💰 Current Charges:');
    const charges = await prisma.charge.findMany({
      include: {
        detailer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (charges.length === 0) {
      console.log('   No charges found');
    } else {
      charges.forEach((charge, index) => {
        console.log(`${index + 1}. ${charge.detailer.businessName}`);
        console.log(`   Amount: $${(charge.amount / 100).toFixed(2)}`);
        console.log(`   Status: ${charge.status}`);
        console.log(`   Description: ${charge.description}`);
        console.log(`   Created: ${charge.createdAt}`);
        console.log('');
      });
    }

    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing booking completion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBookingCompletion();
