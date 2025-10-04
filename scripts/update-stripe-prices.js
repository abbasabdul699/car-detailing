const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateStripePrices() {
  try {
    console.log('🔗 Updating Stripe Price IDs...');

    // Update Detailer Starter plan
    const starterPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: 'Detailer Starter' }
    });

    if (starterPlan) {
      // Replace with your actual Stripe Price ID for Starter plan
      const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_from_stripe';
      
      await prisma.subscriptionPlan.update({
        where: { id: starterPlan.id },
        data: { stripePriceId: starterPriceId }
      });

      console.log(`✅ Updated Detailer Starter with Price ID: ${starterPriceId}`);
    }

    // Update Detailer Pro plan
    const proPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: 'Detailer Pro' }
    });

    if (proPlan) {
      // Replace with your actual Stripe Price ID for Pro plan
      const proPriceId = process.env.STRIPE_PRO_PRICE_ID || 'price_pro_from_stripe';
      
      await prisma.subscriptionPlan.update({
        where: { id: proPlan.id },
        data: { stripePriceId: proPriceId }
      });

      console.log(`✅ Updated Detailer Pro with Price ID: ${proPriceId}`);
    }

    console.log('🎉 Stripe Price IDs updated successfully!');

  } catch (error) {
    console.error('❌ Error updating Stripe Price IDs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateStripePrices()
  .then(() => {
    console.log('🎉 Stripe Price IDs update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });
