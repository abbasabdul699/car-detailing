const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCustomersAPI() {
  console.log('🧪 Testing customers API endpoint...')
  
  try {
    // Test the same query that the API uses
    const customers = await prisma.customer.findMany({
      include: {
        bookings: {
          orderBy: { scheduledDate: 'desc' },
          take: 1
        },
        detailer: {
          select: {
            businessName: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    console.log(`✅ Found ${customers.length} customers`)
    
    if (customers.length > 0) {
      console.log('\n📋 Customer data structure:')
      const sampleCustomer = customers[0]
      console.log('Sample customer:', JSON.stringify(sampleCustomer, null, 2))
    }
    
    // Test with a specific detailer
    const detailers = await prisma.detailer.findMany({
      take: 1,
      select: { id: true, businessName: true }
    })
    
    if (detailers.length > 0) {
      const detailerId = detailers[0].id
      console.log(`\n🔍 Testing with detailer: ${detailers[0].businessName} (${detailerId})`)
      
      const customersForDetailer = await prisma.customer.findMany({
        where: { detailerId },
        include: {
          bookings: {
            orderBy: { scheduledDate: 'desc' },
            take: 1
          },
          detailer: {
            select: {
              businessName: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
      
      console.log(`✅ Found ${customersForDetailer.length} customers for this detailer`)
    }
    
  } catch (error) {
    console.error('❌ Error testing customers API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCustomersAPI()
  .then(() => {
    console.log('\n✅ API test complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('API test failed:', error)
    process.exit(1)
  })
