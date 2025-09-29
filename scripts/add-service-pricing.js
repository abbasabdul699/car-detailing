const { PrismaClient } = require('@prisma/client')
const { normalizeServiceName } = require('../lib/normalizeServiceName')

const prisma = new PrismaClient()

// Default pricing for every service currently in production.
// Keys are normalized (trimmed and lowercased) to avoid name drift issues.
const servicePricing = {
  // Interior Services
  'interior detail': { basePrice: 125, priceRange: '$100-150', duration: 120 },
  'interior cleaning': { basePrice: 85, priceRange: '$60-100', duration: 90 },
  'car seat cleaning': { basePrice: 75, priceRange: '$60-100', duration: 75 },
  'vacuuming': { basePrice: 40, priceRange: '$30-50', duration: 30 },
  'carpet & upholstery shampooing & steaming': { basePrice: 150, priceRange: '$120-180', duration: 150 },
  'dashboard, console & door panel cleaning': { basePrice: 45, priceRange: '$35-60', duration: 40 },
  'odor elimination': { basePrice: 35, priceRange: '$25-45', duration: 30 },
  'odor removal': { basePrice: 120, priceRange: '$100-160', duration: 90 },
  'dog hair removal': { basePrice: 70, priceRange: '$55-95', duration: 75 },
  'leather cleaning and conditioning': { basePrice: 95, priceRange: '$75-130', duration: 75 },
  'mold removal': { basePrice: 200, priceRange: '$170-280', duration: 180 },
  'vomit clean up': { basePrice: 160, priceRange: '$140-220', duration: 120 },
  
  // Exterior Services
  'exterior detail': { basePrice: 160, priceRange: '$130-190', duration: 150 },
  'exterior wash': { basePrice: 40, priceRange: '$25-55', duration: 45 },
  'full detail': { basePrice: 260, priceRange: '$200-320', duration: 240 },
  'hand wash & dry': { basePrice: 50, priceRange: '$40-65', duration: 45 },
  'wax and polish': { basePrice: 100, priceRange: '$80-140', duration: 90 },
  'paint sealant': { basePrice: 210, priceRange: '$180-260', duration: 150 },
  'paint correction': { basePrice: 300, priceRange: '$250-400', duration: 240 },
  'ceramic coating': { basePrice: 500, priceRange: '$400-700', duration: 300 },
  'clay bar treatment': { basePrice: 100, priceRange: '$80-120', duration: 90 },
  'headlight restoration': { basePrice: 120, priceRange: '$80-150', duration: 90 },
  'tire cleaning & dressing': { basePrice: 25, priceRange: '$20-35', duration: 20 },
  'wheel & rim detailing': { basePrice: 70, priceRange: '$55-90', duration: 60 },
  'door jamb cleaning': { basePrice: 50, priceRange: '$30-70', duration: 40 },
  'engine bay cleaning': { basePrice: 60, priceRange: '$40-80', duration: 45 },
  'trim restoration': { basePrice: 110, priceRange: '$90-150', duration: 90 },
  'overspray removal': { basePrice: 220, priceRange: '$180-320', duration: 180 },
  'limescale removal': { basePrice: 85, priceRange: '$70-120', duration: 75 },
  'tree sap removal': { basePrice: 110, priceRange: '$90-150', duration: 90 },
  'scratch removal': { basePrice: 240, priceRange: '$200-350', duration: 210 },
  'bug & tar removal': { basePrice: 70, priceRange: '$50-90', duration: 60 },
  'wipers cleaning': { basePrice: 15, priceRange: '$10-20', duration: 15 },
  'window & mirror cleaning': { basePrice: 25, priceRange: '$20-35', duration: 20 }
}

async function addServicePricing() {
  console.log('💰 Adding default pricing to services...')
  
  try {
    // Get all services
    const services = await prisma.service.findMany()
    console.log(`📊 Found ${services.length} services to update`)
    
    let updatedCount = 0
    const missingServices = []
    
    for (const service of services) {
      const pricing = servicePricing[normalizeServiceName(service.name)]
      
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
        missingServices.push(service.name)
      }
    }
    
    console.log(`\n🎯 Successfully updated ${updatedCount} services with pricing`)

    if (missingServices.length) {
      console.log('\n⚠️  Services still missing pricing:')
      missingServices.sort().forEach(name => console.log(`  • ${name}`))
    }
    
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
