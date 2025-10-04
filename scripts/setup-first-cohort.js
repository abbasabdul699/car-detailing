const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupFirstCohort() {
  try {
    console.log('🎯 Setting up first cohort discount...');

    // Get all detailers
    const detailers = await prisma.detailer.findMany({
      select: { id: true, businessName: true, isFirstCohort: true }
    });

    console.log(`📊 Found ${detailers.length} detailers`);

    // Mark first 10 detailers as first cohort
    const firstCohortDetailers = detailers.slice(0, 10);
    
    for (const detailer of firstCohortDetailers) {
      await prisma.detailer.update({
        where: { id: detailer.id },
        data: { isFirstCohort: true }
      });
      
      console.log(`✅ Marked ${detailer.businessName} as first cohort`);
    }

    console.log('🎉 First cohort setup completed!');
    console.log(`📈 ${firstCohortDetailers.length} detailers marked for discounted rate`);

  } catch (error) {
    console.error('❌ Error setting up first cohort:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup function
setupFirstCohort()
  .then(() => {
    console.log('🎉 First cohort setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
