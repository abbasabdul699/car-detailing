const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanOldSnapshot() {
  try {
    console.log('Cleaning up old customer snapshot with wrong data...');
    
    // Delete the snapshot with customerName "Exterior Detail" and vehicle "2023 Toyota Sienna"
    const result = await prisma.customerSnapshot.deleteMany({
      where: {
        customerPhone: '+17743156930',
        customerName: 'Exterior Detail',
        vehicle: '2023 Toyota Sienna'
      }
    });
    
    console.log(`Deleted ${result.count} old customer snapshots with wrong data`);
    
    // Also delete the customer record with wrong name
    const customerResult = await prisma.customer.deleteMany({
      where: {
        phone: '+17743156930',
        name: 'Exterior Detail'
      }
    });
    
    console.log(`Deleted ${customerResult.count} customer records with wrong name`);
    
    console.log('✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error cleaning up old snapshot:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldSnapshot();
