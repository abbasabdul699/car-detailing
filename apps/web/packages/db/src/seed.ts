import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from the root directory
config({ path: path.resolve(__dirname, '../../../.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing')

  // Check if business already exists
  let business = await prisma.business.findFirst({
    where: { name: 'Premium Auto Detailing' }
  })

  if (!business) {
    // Create a test business
    business = await prisma.business.create({
      data: {
        name: 'Premium Auto Detailing',
        phone: '+17743146930',
        timezone: 'America/New_York',
        pricingRules: {
          basePrices: {
            'Small (Sedan, Coupe, Hatchback)': {
              'Basic Wash': 35,
              'Full Detail (Interior & Exterior)': 150,
              'Premium Detail': 250,
              'Ceramic Coating': 800
            },
            'Medium (SUV, Truck, Van)': {
              'Basic Wash': 45,
              'Full Detail (Interior & Exterior)': 180,
              'Premium Detail': 300,
              'Ceramic Coating': 1000
            },
            'Large (Full-size SUV, Truck)': {
              'Basic Wash': 55,
              'Full Detail (Interior & Exterior)': 220,
              'Premium Detail': 350,
              'Ceramic Coating': 1200
            }
          },
          addOns: {
            'Interior Deep Clean': 50,
            'Paint Correction': 200,
            'Headlight Restoration': 75,
            'Engine Bay Cleaning': 40
          }
        },
        availability: {
          workingHours: {
            monday: { start: '08:00', end: '18:00' },
            tuesday: { start: '08:00', end: '18:00' },
            wednesday: { start: '08:00', end: '18:00' },
            thursday: { start: '08:00', end: '18:00' },
            friday: { start: '08:00', end: '18:00' },
            saturday: { start: '09:00', end: '16:00' },
            sunday: { start: '10:00', end: '14:00' }
          },
          bufferTime: 30,
          maxBookingsPerDay: 8
        },
        playbook: {
          tone: 'professional',
          greeting: 'Hi! I\'m your AI assistant from Premium Auto Detailing. I\'m here to help you get the perfect car detailing service!',
          guardrails: [
            'Always be professional and courteous',
            'Never make promises about specific results',
            'Always confirm pricing before booking',
            'Ask for vehicle details before providing quotes'
          ]
        }
      }
    })
    console.log('✅ Business created:', business.name)
  } else {
    console.log('✅ Business already exists:', business.name)
  }

  // Check if contact already exists
  let contact = await prisma.contact.findFirst({
    where: { phone: '+17743146930' }
  })

  if (!contact) {
    // Create a test contact
    contact = await prisma.contact.create({
      data: {
        businessId: business.id,
        phone: '+17743146930',
        name: 'Abdul Abbas',
        vehicles: [
          {
            type: 'Small (Sedan, Coupe, Hatchback)',
            make: 'Toyota',
            model: 'Camry',
            year: 2020,
            color: 'Silver'
          }
        ]
      }
    })
    console.log('✅ Contact created:', contact.name)
  } else {
    console.log('✅ Contact already exists:', contact.name)
  }

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
