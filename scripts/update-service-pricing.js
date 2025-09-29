const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Example: Update pricing for specific services
async function updateServicePricing() {
  console.log('💰 Updating service pricing...')
  
  try {
    // Example 1: Update a specific service by name
    const updatedService = await prisma.service.updateMany({
      where: { name: 'Interior Detail' },
      data: {
        basePrice: 125,  // New base price
        priceRange: '$100-150',  // Updated price range
        duration: 120  // Duration in minutes
      }
    })
    
    console.log(`✅ Updated ${updatedService.count} service(s)`)
    
    // Example 2: Update multiple services at once
    const updates = [
      {
        name: 'Exterior Detail',
        basePrice: 160,
        priceRange: '$130-190',
        duration: 150
      },
      {
        name: 'Full Detail',
        basePrice: 275,
        priceRange: '$220-330',
        duration: 270
      },
      {
        name: 'Ceramic Coating',
        basePrice: 550,
        priceRange: '$450-750',
        duration: 330
      }
    ]
    
    for (const update of updates) {
      const result = await prisma.service.updateMany({
        where: { name: update.name },
        data: update
      })
      console.log(`✅ Updated ${update.name}: ${result.count} record(s)`)
    }
    
    // Show current pricing
    console.log('\n📊 Current Service Pricing:')
    const services = await prisma.service.findMany({
      where: {
        basePrice: { not: null }
      },
      select: {
        name: true,
        basePrice: true,
        priceRange: true,
        duration: true
      },
      orderBy: { name: 'asc' }
    })
    
    services.forEach(service => {
      console.log(`  • ${service.name}: ${service.priceRange || `$${service.basePrice}`} (${service.duration} min)`)
    })
    
  } catch (error) {
    console.error('Error updating service pricing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Uncomment the line below to run the update
// updateServicePricing()

console.log('🔧 Service Pricing Update Script')
console.log('================================')
console.log('')
console.log('To update service pricing, you have several options:')
console.log('')
console.log('1. 📱 ADMIN PANEL (Recommended):')
console.log('   - Go to: https://your-domain.com/admin/services')
console.log('   - Click "Edit" on any service')
console.log('   - Update Base Price, Price Range, and Duration')
console.log('   - Click Save')
console.log('')
console.log('2. 🔧 DIRECT SCRIPT UPDATE:')
console.log('   - Edit this script with your desired pricing')
console.log('   - Uncomment the last line: updateServicePricing()')
console.log('   - Run: node scripts/update-service-pricing.js')
console.log('')
console.log('3. 🗄️ MONGODB COMPASS (Direct Database):')
console.log('   - Connect to your MongoDB database')
console.log('   - Navigate to the "Service" collection')
console.log('   - Find the service by name')
console.log('   - Update basePrice, priceRange, duration fields')
console.log('')
console.log('4. 📊 CURRENT PRICING:')
console.log('   Run: node scripts/test-pricing-integration.js')
console.log('')

if (process.argv.includes('--update')) {
  updateServicePricing()
    .then(() => {
      console.log('\n✅ Pricing update complete!')
      process.exit(0)
    })
    .catch(error => {
      console.error('Pricing update failed:', error)
      process.exit(1)
    })
}
