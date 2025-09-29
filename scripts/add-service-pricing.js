const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Default pricing for common car detailing services
const servicePricing = {
  // Interior Services
  'Interior Detail': { basePrice: 120, priceRange: '$100-150', duration: 120 },
  'Interior Cleaning': { basePrice: 80, priceRange: '$60-100', duration: 90 },
  'Seat Cleaning': { basePrice: 60, priceRange: '$40-80', duration: 60 },
  'Carpet Cleaning': { basePrice: 50, priceRange: '$30-70', duration: 45 },
  'Dashboard Cleaning': { basePrice: 30, priceRange: '$20-40', duration: 30 },
  'Leather Conditioning': { basePrice: 70, priceRange: '$50-90', duration: 60 },
  'Fabric Protection': { basePrice: 90, priceRange: '$70-110', duration: 75 },
  'Air Freshener': { basePrice: 15, priceRange: '$10-20', duration: 10 },
  
  // Exterior Services
  'Exterior Detail': { basePrice: 150, priceRange: '$120-180', duration: 150 },
  'Exterior Wash': { basePrice: 40, priceRange: '$25-55', duration: 45 },
  'Hand Wash': { basePrice: 35, priceRange: '$25-45', duration: 40 },
  'Wax Application': { basePrice: 80, priceRange: '$60-100', duration: 90 },
  'Paint Correction': { basePrice: 300, priceRange: '$250-400', duration: 240 },
  'Ceramic Coating': { basePrice: 500, priceRange: '$400-700', duration: 300 },
  'Headlight Restoration': { basePrice: 120, priceRange: '$80-150', duration: 90 },
  'Tire Shine': { basePrice: 20, priceRange: '$15-25', duration: 15 },
  'Wheel Cleaning': { basePrice: 40, priceRange: '$25-55', duration: 30 },
  'Clay Bar Treatment': { basePrice: 100, priceRange: '$80-120', duration: 90 },
  
  // Full Service
  'Full Detail': { basePrice: 250, priceRange: '$200-300', duration: 240 },
  'Complete Detail': { basePrice: 300, priceRange: '$250-350', duration: 300 },
  
  // Additional Services
  'Engine Bay Cleaning': { basePrice: 60, priceRange: '$40-80', duration: 45 },
  'Trunk Cleaning': { basePrice: 40, priceRange: '$25-55', duration: 30 },
  'Door Jamb Cleaning': { basePrice: 50, priceRange: '$30-70', duration: 40 },
  'Vinyl Wrap Removal': { basePrice: 200, priceRange: '$150-250', duration: 180 },
  'Paint Protection Film': { basePrice: 800, priceRange: '$600-1200', duration: 480 }
}

async function addServicePricing() {
  console.log('💰 Adding default pricing to services...')
  
  try {
    // Get all services
    const services = await prisma.service.findMany()
    console.log(`📊 Found ${services.length} services to update`)
    
    let updatedCount = 0
    
    for (const service of services) {
      const pricing = servicePricing[service.name]
      
      if (pricing) {
        await prisma.service.update({
          where: { id: service.id },
          data: {
            basePrice: pricing.basePrice,
            priceRange: pricing.priceRange,
            duration: pricing.duration
          }
        })
        
        console.log(`✅ Updated "${service.name}": ${pricing.priceRange} (${pricing.duration} min)`)
        updatedCount++
      } else {
        console.log(`⚠️  No pricing found for "${service.name}"`)
      }
    }
    
    console.log(`\n🎯 Successfully updated ${updatedCount} services with pricing`)
    
    // Show summary of pricing by category
    console.log('\n📋 Pricing Summary by Category:')
    const categories = await prisma.category.findMany({
      include: {
        services: {
          select: {
            name: true,
            basePrice: true,
            priceRange: true,
            duration: true
          }
        }
      }
    })
    
    categories.forEach(category => {
      console.log(`\n${category.name}:`)
      category.services.forEach(service => {
        if (service.basePrice) {
          console.log(`  • ${service.name}: ${service.priceRange} (${service.duration} min)`)
        }
      })
    })
    
  } catch (error) {
    console.error('Error adding service pricing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addServicePricing()
  .then(() => {
    console.log('\n✅ Service pricing update complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Service pricing update failed:', error)
    process.exit(1)
  })
