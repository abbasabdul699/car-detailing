const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupBadNames() {
  console.log('🧹 Cleaning up bad customer names...')
  
  try {
    // Find suspicious names in CustomerSnapshot
    const badSnapshots = await prisma.customerSnapshot.findMany({
      where: {
        OR: [
          { customerName: { in: ['Home','Work','Office','Full Detail','Hey','Hi','Hello','A Nissan Altima','A Toyota Camry'] } },
          { customerName: { contains: 'Nissan' } },
          { customerName: { contains: 'Toyota' } },
          { customerName: { contains: 'Honda' } },
          { customerName: { contains: 'Ford' } },
          { customerName: { contains: 'BMW' } },
          { customerName: { contains: 'Mercedes' } },
          { customerName: { contains: 'Altima' } },
          { customerName: { contains: 'Camry' } },
          { customerName: { contains: 'Civic' } },
          { customerName: { startsWith: 'A ' } },
          { customerName: { startsWith: 'An ' } }
        ]
      },
      select: { id: true, customerName: true, customerPhone: true }
    })
    
    console.log(`📊 Found ${badSnapshots.length} suspicious customer names in snapshots:`)
    badSnapshots.forEach(snapshot => {
      console.log(`  - "${snapshot.customerName}" (${snapshot.customerPhone})`)
    })
    
    if (badSnapshots.length > 0) {
      // Clear the bad names
      const updateResult = await prisma.customerSnapshot.updateMany({
        where: {
          id: { in: badSnapshots.map(s => s.id) }
        },
        data: {
          customerName: ''
        }
      })
      
      console.log(`✅ Cleared ${updateResult.count} bad customer names from snapshots`)
    }
    
    // Find suspicious names in Customer table
    const badCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { in: ['Home','Work','Office','Full Detail','Hey','Hi','Hello','A Nissan Altima','A Toyota Camry'] } },
          { name: { contains: 'Nissan' } },
          { name: { contains: 'Toyota' } },
          { name: { contains: 'Honda' } },
          { name: { contains: 'Ford' } },
          { name: { contains: 'BMW' } },
          { name: { contains: 'Mercedes' } },
          { name: { contains: 'Altima' } },
          { name: { contains: 'Camry' } },
          { name: { contains: 'Civic' } },
          { name: { startsWith: 'A ' } },
          { name: { startsWith: 'An ' } }
        ]
      },
      select: { id: true, name: true, phone: true }
    })
    
    console.log(`📊 Found ${badCustomers.length} suspicious customer names in customers:`)
    badCustomers.forEach(customer => {
      console.log(`  - "${customer.name}" (${customer.phone})`)
    })
    
    if (badCustomers.length > 0) {
      // Clear the bad names
      const updateResult = await prisma.customer.updateMany({
        where: {
          id: { in: badCustomers.map(c => c.id) }
        },
        data: {
          name: ''
        }
      })
      
      console.log(`✅ Cleared ${updateResult.count} bad customer names from customers`)
    }
    
    console.log('\n🎯 Cleanup complete! Bad vehicle names have been cleared.')
    console.log('💡 Next time customers say "My name is [Real Name]", it will properly override these empty names.')
    
  } catch (error) {
    console.error('Error cleaning up bad names:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupBadNames()
  .then(() => {
    console.log('\n✅ Bad name cleanup complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
