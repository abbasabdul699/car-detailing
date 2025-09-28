const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCorruptedCustomerNames() {
  console.log('Fixing corrupted customer names...');
  
  try {
    // Find CustomerSnapshot records with service names as customer names
    const corruptedSnapshots = await prisma.customerSnapshot.findMany({
      where: {
        customerName: {
          in: [
            'Interior Cleaning',
            'Exterior Detail', 
            'Full Detail',
            'Detailing',
            'Car Detailing',
            'Interior Detail',
            'Exterior Cleaning'
          ]
        }
      }
    });
    
    console.log(`Found ${corruptedSnapshots.length} corrupted customer snapshots`);
    
    // Update each corrupted snapshot to have a generic name
    for (const snapshot of corruptedSnapshots) {
      await prisma.customerSnapshot.update({
        where: { id: snapshot.id },
        data: { 
          customerName: 'Customer' // Reset to generic name
        }
      });
      console.log(`Fixed snapshot ${snapshot.id}: "${snapshot.customerName}" -> "Customer"`);
    }
    
    // Also fix Customer records with service names
    const corruptedCustomers = await prisma.customer.findMany({
      where: {
        name: {
          in: [
            'Interior Cleaning',
            'Exterior Detail', 
            'Full Detail',
            'Detailing',
            'Car Detailing',
            'Interior Detail',
            'Exterior Cleaning'
          ]
        }
      }
    });
    
    console.log(`Found ${corruptedCustomers.length} corrupted customer records`);
    
    for (const customer of corruptedCustomers) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { 
          name: 'Customer' // Reset to generic name
        }
      });
      console.log(`Fixed customer ${customer.id}: "${customer.name}" -> "Customer"`);
    }
    
    console.log('✅ Successfully fixed corrupted customer names!');
    
  } catch (error) {
    console.error('❌ Error fixing corrupted customer names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCorruptedCustomerNames();
