const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkCustomers() {
  console.log('🔍 Checking customers in database...')
  
  try {
    // Check total customers
    const totalCustomers = await prisma.customer.count()
    console.log(`📊 Total customers in database: ${totalCustomers}`)
    
    if (totalCustomers === 0) {
      console.log('❌ No customers found in database')
      console.log('💡 This could be because:')
      console.log('   1. No bookings have been made yet')
      console.log('   2. Customer data is stored in CustomerSnapshot instead')
      console.log('   3. Database connection issues')
      
      // Check CustomerSnapshot table
      const totalSnapshots = await prisma.customerSnapshot.count()
      console.log(`📸 Total customer snapshots: ${totalSnapshots}`)
      
      if (totalSnapshots > 0) {
        console.log('✅ Customer data found in CustomerSnapshot table!')
        console.log('🔧 The admin page should be updated to show CustomerSnapshot data instead')
        
        // Show sample snapshots
        const snapshots = await prisma.customerSnapshot.findMany({
          take: 5,
          include: {
            detailer: {
              select: {
                businessName: true
              }
            }
          }
        })
        
        console.log('\n📋 Sample customer snapshots:')
        snapshots.forEach((snapshot, index) => {
          console.log(`${index + 1}. ${snapshot.customerName || 'No name'} (${snapshot.customerPhone})`)
          console.log(`   Business: ${snapshot.detailer?.businessName || 'Unknown'}`)
          console.log(`   Email: ${snapshot.customerEmail || 'No email'}`)
          console.log(`   Vehicle: ${snapshot.vehicle || 'No vehicle'}`)
          console.log(`   Address: ${snapshot.address || 'No address'}`)
          console.log('')
        })
      }
    } else {
      // Show sample customers
      const customers = await prisma.customer.findMany({
        take: 5,
        include: {
          detailer: {
            select: {
              businessName: true
            }
          }
        }
      })
      
      console.log('\n📋 Sample customers:')
      customers.forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} (${customer.phone})`)
        console.log(`   Business: ${customer.detailer?.businessName || 'Unknown'}`)
        console.log(`   Email: ${customer.email || 'No email'}`)
        console.log(`   Address: ${customer.address || 'No address'}`)
        console.log('')
      })
    }
    
    // Check detailers
    const totalDetailers = await prisma.detailer.count()
    console.log(`🏢 Total detailers in database: ${totalDetailers}`)
    
    // Check conversations
    const totalConversations = await prisma.conversation.count()
    console.log(`💬 Total conversations in database: ${totalConversations}`)
    
    // Check messages
    const totalMessages = await prisma.message.count()
    console.log(`📱 Total messages in database: ${totalMessages}`)
    
  } catch (error) {
    console.error('Error checking customers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCustomers()
  .then(() => {
    console.log('\n✅ Customer check complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Customer check failed:', error)
    process.exit(1)
  })
