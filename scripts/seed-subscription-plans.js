const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  try {
    console.log('🌱 Seeding subscription plans...');

    // Detailer Starter Plan
    const starterPlan = await prisma.subscriptionPlan.upsert({
      where: { name: 'Detailer Starter' },
      update: {},
      create: {
        name: 'Detailer Starter',
        type: 'pay_per_booking',
        price: 3.00,
        description: 'Perfect for new or low-volume detailers. Pay only when you get bookings.',
        features: [
          'Local Search Visibility Only. Be featured in front of customers looking for detailers',
          'Limited Photos and Services. Customers book with you directly, hassle-free',
          'Only Direct Bookings We handle marketing so you don\'t have to',
          'AI-Powered Customer Service Automated responses and booking assistance',
          'Basic Support Cancel anytime if you\'re not seeing results'
        ],
        isActive: true,
      },
    });

    // Detailer Pro Plan
    const proPlan = await prisma.subscriptionPlan.upsert({
      where: { name: 'Detailer Pro' },
      update: {},
      create: {
        name: 'Detailer Pro',
        type: 'monthly',
        price: 300.00,
        description: 'Ideal for detailers with consistent or high booking volume.',
        features: [
          'Instant Visibility. Be featured in front of customers looking for detailers',
          'Professional Profile. We build your page with unlimited services, photos, and pricing',
          'No Website Needed. Customers book with you directly, hassle-free',
          'SEO & Ads Done for You. We handle marketing so you don\'t have to, and metric to see results',
          'Advanced AI Features Smart scheduling, pricing optimization, and customer insights',
          'AI-Powered Analytics Data-driven insights to grow your business'
        ],
        isActive: true,
      },
    });

    console.log('✅ Subscription plans seeded successfully!');
    console.log('📋 Plans created:');
    console.log(`   - ${starterPlan.name}: $${starterPlan.price} ${starterPlan.type}`);
    console.log(`   - ${proPlan.name}: $${proPlan.price} ${proPlan.type}`);

  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSubscriptionPlans()
  .then(() => {
    console.log('🎉 Database seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
