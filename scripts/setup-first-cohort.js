const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupFirstCohort() {
  try {
    console.log('🎯 Setting up first cohort of 10 detailers...');

    // Get the first 10 detailers (oldest by creation date)
    const firstCohortDetailers = await prisma.detailer.findMany({
      where: {
        isFirstCohort: false, // Only get detailers not already marked
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10,
      select: {
        id: true,
        businessName: true,
        email: true,
        createdAt: true,
      },
    });

    if (firstCohortDetailers.length === 0) {
      console.log('❌ No detailers found to mark as first cohort');
      return;
    }

    console.log(`📋 Found ${firstCohortDetailers.length} detailers to mark as first cohort:`);
    firstCohortDetailers.forEach((detailer, index) => {
      console.log(`  ${index + 1}. ${detailer.businessName} (${detailer.email}) - Created: ${detailer.createdAt.toISOString().split('T')[0]}`);
    });

    // Update all first cohort detailers
    const updateResult = await prisma.detailer.updateMany({
      where: {
        id: {
          in: firstCohortDetailers.map(d => d.id),
        },
      },
      data: {
        isFirstCohort: true,
      },
    });

    console.log(`✅ Successfully marked ${updateResult.count} detailers as first cohort`);
    console.log('🎉 First cohort setup completed!');
    console.log('');
    console.log('💡 These detailers will receive a 15% discount on the Detailer Pro plan');

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
    console.log('🎉 First cohort setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });