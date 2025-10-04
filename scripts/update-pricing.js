const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePricing() {
  try {
    console.log('💰 Updating pricing to $300/month with 15% first cohort discount...');

    // Update Detailer Pro plan to $300
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { name: 'Detailer Pro' },
      data: { price: 300.00 }
    });

    console.log(`✅ Updated ${updatedPlan.name} to $${updatedPlan.price}/month`);

    // Show current pricing structure
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    console.log('\n📋 Current Pricing Structure:');
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price} ${plan.type}`);
    });

    console.log('\n🎯 First Cohort Benefits:');
    console.log('   - Detailer Starter: $3/booking (no discount)');
    console.log('   - Detailer Pro: $255/month (15% off $300)');

    console.log('\n🎉 Pricing update completed!');

  } catch (error) {
    console.error('❌ Error updating pricing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updatePricing()
  .then(() => {
    console.log('🎉 Pricing update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });
