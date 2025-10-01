import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  const detailers = [
      {
        id: "681bcef6a71960c3048e0db2", // Keep the same ID for Brooks Car Care
        businessName: "Brooks Car Care",
        email: "brooks.carcare@gmail.com",
        phone: "(617) 882-7958",
        address: "123 Main Street",
        city: "Boston",
        state: "MA",
        zipCode: "02101",
        description: "Welcome to Brooks Car Care, your premier mobile car detailing service in the Greater Boston area. We bring professional-grade detailing services directly to your location, whether at home, office, or anywhere convenient for you. Our experienced team uses top-quality products and equipment to restore your vehicle's shine and protect its value.",
        latitude: 42.3601,
        longitude: -71.0589,
        priceRange: "$$$",
        website: "https://brookscarcare.com",
        twilioPhoneNumber: "+16178827958",
        smsEnabled: true,
        businessHours: {
          monday: ["08:00", "18:00"],
          tuesday: ["08:00", "18:00"],
          wednesday: ["08:00", "18:00"],
          thursday: ["08:00", "18:00"],
          friday: ["08:00", "18:00"],
          saturday: ["09:00", "16:00"],
          sunday: ["10:00", "15:00"]
        }
      },
      {
        businessName: "Spade Detailing",
        email: "info@spadedetailing.com",
        phone: "(555) 123-4567",
        address: "456 Oak Avenue",
        city: "Cambridge",
        state: "MA",
        zipCode: "02139",
        description: "Spade Detailing specializes in premium automotive care and protection services. We offer comprehensive detailing packages including paint correction, ceramic coatings, and interior restoration. Our team of certified professionals ensures every vehicle receives the attention and care it deserves, using the latest techniques and premium products.",
        latitude: 42.3736,
        longitude: -71.1097,
        priceRange: "$$$$",
        website: "https://spadedetailing.com",
        businessHours: {
          monday: ["09:00", "17:00"],
          tuesday: ["09:00", "17:00"],
          wednesday: ["09:00", "17:00"],
          thursday: ["09:00", "17:00"],
          friday: ["09:00", "17:00"],
          saturday: ["10:00", "15:00"],
          sunday: null
        }
      }
  ]

  for (const detailerData of detailers) {
    try {
      const created = await prisma.detailer.create({
        data: detailerData as any, // temporary type assertion to fix TypeScript error
        include: {
          images: true
        }
      })
      console.log(`Created detailer: ${created.businessName}`)
    } catch (error) {
      console.error(`Error creating detailer ${detailerData.businessName}:`, error)
    }
  }

  const count = await prisma.detailer.count()
  console.log(`Database seeding completed! Created ${count} detailers`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 