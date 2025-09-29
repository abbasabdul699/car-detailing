const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPricingIntegration() {
  console.log('🧪 Testing pricing integration...')
  
  try {
    // Test 1: Get services with pricing
    console.log('\n📊 Test 1: Services with pricing')
    const services = await prisma.service.findMany({
      where: {
        basePrice: { not: null }
      },
      select: {
        name: true,
        basePrice: true,
        priceRange: true,
        duration: true,
        category: {
          select: { name: true }
        }
      }
    })
    
    console.log(`Found ${services.length} services with pricing:`)
    services.forEach(service => {
      console.log(`  • ${service.name} (${service.category?.name}): ${service.priceRange || `$${service.basePrice}`} - ${service.duration} min`)
    })
    
    // Test 2: Get detailer services with pricing
    console.log('\n📊 Test 2: Detailer services with pricing')
    const detailerServices = await prisma.detailerService.findMany({
      take: 5,
      include: {
        service: {
          include: {
            category: true
          }
        }
      }
    })
    
    console.log(`Found ${detailerServices.length} detailer services:`)
    detailerServices.forEach(ds => {
      const service = ds.service
      let pricing = 'No pricing'
      if (service.priceRange) {
        pricing = service.priceRange
      } else if (service.basePrice) {
        pricing = `$${service.basePrice}`
      }
      
      console.log(`  • ${service.name} (${service.category?.name || 'No category'}): ${pricing}`)
    })
    
    // Test 3: Simulate service formatting for AI
    console.log('\n📊 Test 3: AI Service Formatting')
    const servicesByCategory = detailerServices.reduce((acc, ds) => {
      const category = ds.service.category?.name || 'Other'
      if (!acc[category]) acc[category] = []
      
      // Format service with pricing if available
      let serviceInfo = ds.service.name
      if (ds.service.priceRange) {
        serviceInfo += ` (${ds.service.priceRange})`
      } else if (ds.service.basePrice) {
        serviceInfo += ` ($${ds.service.basePrice})`
      }
      
      acc[category].push(serviceInfo)
      return acc
    }, {})
    
    const availableServices = Object.entries(servicesByCategory)
      .map(([category, services]) => `${category}: ${services.join(', ')}`)
      .join(' | ')
    
    console.log('Available Services for AI:')
    console.log(availableServices)
    
    console.log('\n✅ Pricing integration test complete!')
    
  } catch (error) {
    console.error('Error testing pricing integration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPricingIntegration()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Test failed:', error)
    process.exit(1)
  })
