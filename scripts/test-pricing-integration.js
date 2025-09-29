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
      const parts = []
      if (service.priceRange) {
        parts.push(service.priceRange)
      } else if (typeof service.basePrice === 'number') {
        const formattedBase = Number.isInteger(service.basePrice)
          ? service.basePrice.toString()
          : service.basePrice.toFixed(2)
        parts.push(`$${formattedBase}`)
      }
      if (typeof service.duration === 'number' && service.duration > 0) {
        parts.push(`${service.duration} min`)
      }
      pricing = parts.join(', ') || pricing

      console.log(`  • ${service.name} (${service.category?.name || 'No category'}): ${pricing}`)
    })
    
    // Test 3: Simulate service formatting for AI
    console.log('\n📊 Test 3: AI Service Formatting')
    const servicesByCategory = detailerServices.reduce((acc, ds) => {
      const category = ds.service.category?.name || 'Other'
      if (!acc[category]) acc[category] = []
      
      // Format service with pricing if available
      let serviceInfo = ds.service.name
      const infoParts = []
      if (ds.service.priceRange) {
        infoParts.push(ds.service.priceRange)
      } else if (typeof ds.service.basePrice === 'number') {
        const formattedBase = Number.isInteger(ds.service.basePrice)
          ? ds.service.basePrice.toString()
          : ds.service.basePrice.toFixed(2)
        infoParts.push(`$${formattedBase}`)
      }
      if (typeof ds.service.duration === 'number' && ds.service.duration > 0) {
        infoParts.push(`${ds.service.duration} min`)
      }
      if (infoParts.length) {
        serviceInfo += ` (${infoParts.join(', ')})`
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
