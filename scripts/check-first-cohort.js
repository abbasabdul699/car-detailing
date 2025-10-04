const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFirstCohort() {
  try {
    console.log('🎯 First Cohort Status Check');
    console.log('============================');

    // Get all detailers with their first cohort status
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        email: true,
        isFirstCohort: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const firstCohortCount = detailers.filter(d => d.isFirstCohort).length;
    const totalDetailers = detailers.length;

    console.log(`📊 Total Detailers: ${totalDetailers}`);
    console.log(`🎉 First Cohort Members: ${firstCohortCount}`);
    console.log(`📈 Remaining Slots: ${Math.max(0, 10 - firstCohortCount)}`);
    console.log('');

    if (firstCohortCount > 0) {
      console.log('🏆 First Cohort Members:');
      detailers
        .filter(d => d.isFirstCohort)
        .forEach((detailer, index) => {
          console.log(`  ${index + 1}. ${detailer.businessName} (${detailer.email})`);
          console.log(`     Created: ${detailer.createdAt.toISOString().split('T')[0]}`);
        });
    }

    console.log('');
    console.log('💡 First Cohort Benefits:');
    console.log('  ✅ 15% discount on Detailer Pro plan ($300/month → $255/month)');
    console.log('  ✅ Discount applies automatically when they subscribe');
    console.log('  ✅ Discount is permanent (forever)');
    console.log('  ✅ Only available to first 10 detailers');

    if (firstCohortCount < 10) {
      console.log('');
      console.log('🎯 To add more detailers to first cohort:');
      console.log('  1. Run: node scripts/setup-first-cohort.js');
      console.log('  2. Or manually update detailers in database');
    }

  } catch (error) {
    console.error('❌ Error checking first cohort:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check function
checkFirstCohort()
  .then(() => {
    console.log('🎉 First cohort check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });
