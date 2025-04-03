import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // Clear existing data
  await prisma.image.deleteMany({})
  await prisma.detailer.deleteMany({})
  console.log('Cleared existing data')

  const detailers = [
    {
      businessName: "Uncle Mike's Detailing",
      email: "mike@unclemikes.com",
      phone: "(508) 982-0451",
      address: "124 Pine St",
      city: "Attleboro",
      state: "MA",
      zipCode: "02703",
      description: "Professional mobile detailing service with over 10 years of experience. We come to you!",
      latitude: 41.9389,
      longitude: -71.3033,
      priceRange: "$$",
      services: ["Basic Wash", "Full Detail", "Paint Correction"],
      images: {
        create: [
          {
            url: "/images/detailers/green-car.jpg",
            alt: "Uncle Mike's Detailing"
          }
        ]
      }
    },
    {
      businessName: "DF Detailing",
      email: "info@dfdetailing.com",
      phone: "(857) 243-5290",
      address: "21 Manville Hill Rd",
      city: "Cumberland",
      state: "RI",
      zipCode: "02864",
      description: "Expert mobile detailing services. Satisfaction guaranteed!",
      latitude: 41.7166,
      longitude: -71.4222,
      priceRange: "$",
      services: ["Basic Wash", "Interior Detail", "Ceramic Coating"],
      images: {
        create: [
          {
            url: "/images/detailers/df-detailing.jpg",
            alt: "DF Detailing"
          }
        ]
      }
    },
    {
      businessName: "Pay Attention To Detail",
      email: "contact@payattention.com",
      phone: "(857) 244-1516",
      address: "20 Parkman St",
      city: "Dorchester",
      state: "MA",
      zipCode: "02122",
      description: "Professional detailing with attention to every detail. Premium service at competitive prices.",
      latitude: 42.2966,
      longitude: -71.0597,
      priceRange: "$$$",
      services: ["Full Detail", "Paint Correction", "Ceramic Coating"],
      images: {
        create: [
          {
            url: "/images/detailers/pay-attention.jpg",
            alt: "Pay Attention To Detail"
          }
        ]
      }
    },
    {
      businessName: "Jay's Mobile Detailing",
      email: "jay@jaysdetailing.com",
      phone: "(401) 678-9226",
      address: "1634 Elmwood Ave",
      city: "Cranston",
      state: "RI",
      zipCode: "02910",
      description: "Mobile detailing service that comes to you. Quality work at affordable prices.",
      latitude: 41.7633,
      longitude: -71.4250,
      priceRange: "$$",
      services: ["Basic Wash", "Full Detail", "Interior Detail"],
      images: {
        create: [
          {
            url: "/images/detailers/jays-detailing.jpg",
            alt: "Jay's Mobile Detailing"
          }
        ]
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